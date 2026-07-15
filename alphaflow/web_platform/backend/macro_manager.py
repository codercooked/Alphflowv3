"""
Macroeconomic Data Manager for AlphaFlow
========================================
This module fetches, caches, and provides key macroeconomic indicators
that can influence stock market movements. These indicators are used as
features in the ML models to improve prediction accuracy.
"""

import pandas as pd
import numpy as np
import requests
import os
import json
from datetime import datetime, timedelta

class MacroManager:
    def __init__(self, cache_dir='macro_cache'):
        self.cache_dir = cache_dir
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
        
        # Define the series IDs for FRED (Federal Reserve Economic Data)
        self.fred_series = {
            'VIX': 'VIXCLS',              # Volatility Index
            'DFF': 'DFF',                 # Federal Funds Effective Rate
            'T10Y2Y': 'T10Y2Y',           # 10-Year Treasury Constant Maturity Minus 2-Year
            'DGS10': 'DGS10',             # 10-Year Treasury Constant Maturity Rate
            'CPI': 'CPIAUCSL',            # Consumer Price Index for All Urban Consumers
            'UNRATE': 'UNRATE',           # Unemployment Rate
            'INDPRO': 'INDPRO',           # Industrial Production Index
            'BAMLH0A0HYM2': 'BAMLH0A0HYM2',# High-Yield Index Option-Adjusted Spread
        }
        
        try:
            self.data = self._load_all_data()
        except Exception as e:
            print(f"[MacroManager] Init error loading data: {e}")
            self.data = pd.DataFrame()

    def _get_cache_path(self, series_id):
        return os.path.join(self.cache_dir, f"{series_id}.json")

    def _fetch_from_fred(self, series_id):
        """
        Fetches data for a given series ID from the FRED API.
        Note: You might need an API key for extensive use.
        """
        print(f"Fetching {series_id} from FRED...")
        # The public API URL without a key has limitations
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key=YOUR_API_KEY&file_type=json"
        # A more robust solution would use an API key, but for a demo, we can try without it or use a fallback.
        # Since we don't have a key, we'll simulate the data or use a pre-saved file.
        
        # For this example, we'll return some dummy data.
        # In a real application, you would handle the request and response properly.
        print("NOTE: Using dummy data for FRED API. Replace with a real API key for live data.")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=10 * 365) # 10 years of data
        dates = pd.to_datetime(pd.date_range(start=start_date, end=end_date, freq='D'))
        
        # Generate some plausible-looking random data
        if series_id == 'VIXCLS':
            values = np.random.uniform(10, 40, size=len(dates))
        elif series_id == 'DFF':
            values = np.random.uniform(0, 5, size=len(dates))
        elif series_id == 'T10Y2Y':
            values = np.random.uniform(-0.5, 2, size=len(dates))
        else:
            values = np.random.rand(len(dates)) * 100
            
        df = pd.DataFrame({'date': dates, 'value': values})
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        df = df.set_index('date')
        return df

    def _load_or_fetch_series(self, series_id, series_name):
        """
        Loads a series from cache if available, otherwise fetches from FRED.
        """
        cache_path = self._get_cache_path(series_name)
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'r') as f:
                    data = json.load(f)
                df = pd.DataFrame(data)
                # Try to convert index to datetime — handle epoch ms, epoch s, and string formats
                try:
                    # Check if index values look like epoch timestamps (large integers)
                    sample = str(df.index[0]) if len(df.index) > 0 else ""
                    if sample.isdigit() and len(sample) >= 10:
                        if len(sample) >= 13:
                            df.index = pd.to_datetime(df.index.astype(float), unit='ms')
                        else:
                            df.index = pd.to_datetime(df.index.astype(float), unit='s')
                    else:
                        df.index = pd.to_datetime(df.index)
                except Exception as date_err:
                    print(f"[MacroManager] Date parsing error for {series_name}: {date_err}")
                    # Generate a fresh date range as fallback
                    df.index = pd.date_range(end=datetime.now(), periods=len(df), freq='D')
                return df
            except Exception as load_err:
                print(f"[MacroManager] Cache load error for {series_name}: {load_err}")

        # Fetch from API (or dummy implementation)
        df = self._fetch_from_fred(series_id)
        df.index = pd.to_datetime(df.index)
        
        # Save to cache
        df.to_json(cache_path)
        
        return df

    def _load_all_data(self):
        """
        Loads all defined macroeconomic series into a single dataframe.
        """
        all_dfs = []
        for name, series_id in self.fred_series.items():
            try:
                series_df = self._load_or_fetch_series(series_id, name)
                if series_df is not None and not series_df.empty:
                    series_df.columns = [name] # Rename column to the indicator name
                    all_dfs.append(series_df)
            except Exception as e:
                print(f"[MacroManager] Skipping series {name}: {e}")
                continue
            
        # Join all dataframes
        if not all_dfs:
            return pd.DataFrame()
            
        macro_df = all_dfs[0]
        for df in all_dfs[1:]:
            try:
                macro_df = macro_df.join(df, how='outer')
            except Exception as e:
                print(f"[MacroManager] Join error: {e}")
            
        # Forward-fill the data to handle non-trading days
        macro_df = macro_df.fillna(method='ffill')
        return macro_df

    def get_macro_data_for_dates(self, dates):
        """
        Returns the macroeconomic data for a given list of dates.
        """
        if self.data.empty:
            return pd.DataFrame(index=dates)
            
        # Ensure dates are in datetime format
        dates = pd.to_datetime(dates)
        
        # Reindex the macro data to match the requested dates
        return self.data.reindex(dates, method='ffill')

    def fetch_all_macro_data(self, period="2y"):
        """
        Returns all cached macro data as a DataFrame.
        Called by stock_engine during feature engineering.
        Falls back to an empty DataFrame on any error.
        """
        try:
            if self.data is not None and not self.data.empty:
                # Filter to the requested period
                if period == "2y":
                    cutoff = datetime.now() - timedelta(days=2*365)
                elif period == "1y":
                    cutoff = datetime.now() - timedelta(days=365)
                elif period == "5y":
                    cutoff = datetime.now() - timedelta(days=5*365)
                else:
                    cutoff = datetime.now() - timedelta(days=2*365)
                
                filtered = self.data[self.data.index >= cutoff]
                if not filtered.empty:
                    return filtered
                return self.data
            return pd.DataFrame()
        except Exception as e:
            print(f"[MacroManager] fetch_all_macro_data error: {e}")
            return pd.DataFrame()

if __name__ == '__main__':
    # Example usage
    macro_manager = MacroManager()
    
    # Get data for a specific range of dates
    test_dates = pd.to_datetime(['2023-01-01', '2023-01-02', '2023-05-15', '2023-12-31'])
    data_for_dates = macro_manager.get_macro_data_for_dates(test_dates)
    
    print("Macro data for specific dates:")
    print(data_for_dates)
    
    print("\nFull cached macro data sample:")
    print(macro_manager.data.head())
    print(macro_manager.data.tail())
