import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class OptionsEngine:
    """
    Fetches and processes Options Chain data for Indian stocks.
    Uses yfinance as the data source.
    """
    
    def __init__(self):
        self.cache = {}
        
    def get_available_expiries(self, ticker):
        """
        Returns list of available expiry dates for options.
        """
        try:
            stock = yf.Ticker(ticker)
            expiries = stock.options
            if not expiries:
                return []
            return list(expiries)
        except Exception as e:
            print(f"Error fetching expiries for {ticker}: {e}")
            return []
    
    def get_options_chain(self, ticker, expiry=None):
        """
        Fetches the options chain for a given ticker and expiry.
        Returns dict: {'calls': DataFrame, 'puts': DataFrame, 'spot': float}
        """
        try:
            stock = yf.Ticker(ticker)
            
            # If no expiry specified, use the nearest one
            if expiry is None:
                expiries = stock.options
                if not expiries:
                    return None
                expiry = expiries[0]  # Nearest expiry
            
            # Fetch option chain
            chain = stock.option_chain(expiry)
            
            # Get current spot price
            hist = stock.history(period='1d')
            spot_price = hist['Close'].iloc[-1] if not hist.empty else 0
            
            # Process calls and puts
            calls_df = chain.calls
            puts_df = chain.puts
            
            # Add useful columns
            if not calls_df.empty:
                calls_df['type'] = 'CE'
                calls_df['moneyness'] = self._calculate_moneyness(calls_df['strike'], spot_price, 'call')
                
            if not puts_df.empty:
                puts_df['type'] = 'PE'
                puts_df['moneyness'] = self._calculate_moneyness(puts_df['strike'], spot_price, 'put')
            
            return {
                'calls': calls_df,
                'puts': puts_df,
                'spot': spot_price,
                'expiry': expiry
            }
            
        except Exception as e:
            print(f"Error fetching options chain for {ticker}: {e}")
            return None
    
    def _calculate_moneyness(self, strikes, spot, option_type):
        """
        Calculate moneyness: ITM (In The Money), ATM (At The Money), OTM (Out of The Money)
        """
        moneyness = []
        for strike in strikes:
            diff = abs(strike - spot)
            pct_diff = (diff / spot) * 100
            
            if pct_diff < 2:  # Within 2% is ATM
                moneyness.append('ATM')
            elif option_type == 'call':
                moneyness.append('ITM' if strike < spot else 'OTM')
            else:  # put
                moneyness.append('ITM' if strike > spot else 'OTM')
                
        return moneyness
    
    def filter_atm_options(self, chain_data, num_strikes=5):
        """
        Filters options to show only ATM +/- num_strikes.
        Returns filtered dict with same structure.
        """
        if not chain_data:
            return None
            
        spot = chain_data['spot']
        calls = chain_data['calls']
        puts = chain_data['puts']
        
        # Find ATM strike (closest to spot)
        if not calls.empty:
            calls['distance'] = abs(calls['strike'] - spot)
            calls_sorted = calls.sort_values('distance')
            
            # Get ATM index
            atm_idx = calls_sorted.index[0]
            atm_position = calls.index.get_loc(atm_idx)
            
            # Filter range
            start_idx = max(0, atm_position - num_strikes)
            end_idx = min(len(calls), atm_position + num_strikes + 1)
            
            calls_filtered = calls.iloc[start_idx:end_idx].drop('distance', axis=1)
        else:
            calls_filtered = calls
            
        if not puts.empty:
            puts['distance'] = abs(puts['strike'] - spot)
            puts_sorted = puts.sort_values('distance')
            
            atm_idx = puts_sorted.index[0]
            atm_position = puts.index.get_loc(atm_idx)
            
            start_idx = max(0, atm_position - num_strikes)
            end_idx = min(len(puts), atm_position + num_strikes + 1)
            
            puts_filtered = puts.iloc[start_idx:end_idx].drop('distance', axis=1)
        else:
            puts_filtered = puts
        
        return {
            'calls': calls_filtered,
            'puts': puts_filtered,
            'spot': spot,
            'expiry': chain_data['expiry']
        }
    
    def get_option_greeks_simple(self, option_data, spot, days_to_expiry):
        """
        Calculate simplified Greeks (Delta approximation).
        For production, use proper Black-Scholes.
        """
        # Simplified Delta calculation
        # Call Delta: 0 (deep OTM) to 1 (deep ITM)
        # Put Delta: -1 (deep ITM) to 0 (deep OTM)
        
        greeks = []
        for _, row in option_data.iterrows():
            strike = row['strike']
            option_type = row['type']
            
            # Simple moneyness-based delta
            diff_pct = ((spot - strike) / spot) * 100
            
            if option_type == 'CE':
                if diff_pct > 10:  # Deep ITM
                    delta = 0.9
                elif diff_pct < -10:  # Deep OTM
                    delta = 0.1
                else:  # Near ATM
                    delta = 0.5 + (diff_pct / 20)
            else:  # PE
                if diff_pct < -10:  # Deep ITM
                    delta = -0.9
                elif diff_pct > 10:  # Deep OTM
                    delta = -0.1
                else:  # Near ATM
                    delta = -0.5 + (diff_pct / 20)
            
            greeks.append({
                'delta': round(delta, 2),
                'theta': -0.05,  # Placeholder
                'vega': 0.2,     # Placeholder
                'gamma': 0.05    # Placeholder
            })
        
        return greeks
