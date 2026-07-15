"""
Feature Engineer for AlphaFlow
===============================
This module is responsible for creating a rich set of features for the ML models.
It computes a wide range of technical indicators, macro-economic features, and
other derived metrics that are crucial for accurate stock price prediction.
"""

import pandas as pd
import numpy as np
from ta import add_all_ta_features
from ta.utils import dropna

class FeatureEngineer:
    def __init__(self, macro_manager=None):
        self.macro_manager = macro_manager

    def _compute_technical_indicators(self, df):
        """
        Computes a comprehensive set of technical indicators using the 'ta' library.
        """
        df = df.copy()
        
        # Add all technical analysis features
        df = add_all_ta_features(
            df, open="Open", high="High", low="Low", close="Close", volume="Volume", fillna=True
        )
        
        # Add some custom indicators or variations if needed
        df['custom_indicator'] = df['close'] / df['open'] # Example custom indicator
        
        return df

    def _add_macro_features(self, df):
        """
        Adds macroeconomic features to the dataframe.
        """
        if self.macro_manager:
            macro_data = self.macro_manager.get_macro_data_for_dates(df.index)
            df = df.join(macro_data, how='left')
            df = df.fillna(method='ffill').fillna(method='bfill')
        return df

    def generate_features(self, df, with_macro=False):
        """
        Main function to generate all features for the given stock data.
        """
        # 1. Compute technical indicators
        df_with_ta = self._compute_technical_indicators(df)
        
        # 2. Add macroeconomic features
        if with_macro:
            df_with_ta = self._add_macro_features(df_with_ta)
            
        # 3. Drop rows with NaN values that might have been created
        df_with_ta = dropna(df_with_ta)
        
        # 4. Select and return the feature set
        # For now, returning all columns, but this can be refined
        return df_with_ta

if __name__ == '__main__':
    # Example usage:
    # This requires yfinance to be installed: pip install yfinance
    import yfinance as yf
    
    # Fetch some data
    ticker = 'RELIANCE.NS'
    data = yf.download(ticker, start='2022-01-01', end='2023-01-01')
    
    # Initialize the feature engineer
    feature_engineer = FeatureEngineer()
    
    # Generate features
    features_df = feature_engineer.generate_features(data)
    
    print(f"Original data shape: {data.shape}")
    print(f"Data with features shape: {features_df.shape}")
    print("\nColumns added:")
    for col in features_df.columns:
        if col not in data.columns:
            print(f"- {col}")
            
    print("\nSample of the feature-rich data:")
    print(features_df.head())
