"""
Insider Trading Data Manager for AlphaFlow
==========================================
This module simulates the fetching and processing of insider trading data.
In a real-world scenario, this would connect to a financial data provider's API
that offers data on trades made by company insiders (e.g., executives, large shareholders).
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class InsiderTradingManager:
    def __init__(self):
        # In a real system, this would be a database or a live feed.
        # Here, we simulate it with a pre-generated cache.
        self.insider_data = self._generate_dummy_data()

    def _generate_dummy_data(self):
        """
        Generates a DataFrame of plausible-looking insider trades for various tickers.
        """
        tickers = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS']
        data = []
        today = datetime.now()
        
        for _ in range(200): # Generate 200 dummy trades
            ticker = np.random.choice(tickers)
            trade_date = today - timedelta(days=np.random.randint(1, 365))
            trade_type = np.random.choice(['Buy', 'Sell'], p=[0.6, 0.4]) # Buys are more common
            quantity = np.random.randint(100, 10000)
            price = np.random.uniform(500, 3000)
            
            data.append({
                'ticker': ticker,
                'date': trade_date,
                'trade_type': trade_type,
                'quantity': quantity,
                'value': quantity * price
            })
            
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        return df

    def get_insider_activity_for_ticker(self, ticker, days_lookback=90):
        """
        Aggregates insider trading activity for a specific ticker over a lookback period.
        
        :param ticker: The stock ticker.
        :param days_lookback: The number of past days to consider.
        :return: A dictionary with aggregated buy/sell volume and net activity.
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_lookback)
        
        ticker_data = self.insider_data[
            (self.insider_data['ticker'] == ticker) &
            (self.insider_data.index >= start_date)
        ]
        
        if ticker_data.empty:
            return {'buy_volume': 0, 'sell_volume': 0, 'net_activity': 0, 'trade_count': 0}
            
        buy_volume = ticker_data[ticker_data['trade_type'] == 'Buy']['value'].sum()
        sell_volume = ticker_data[ticker_data['trade_type'] == 'Sell']['value'].sum()
        
        return {
            'buy_volume': buy_volume,
            'sell_volume': sell_volume,
            'net_activity': buy_volume - sell_volume,
            'trade_count': len(ticker_data)
        }

if __name__ == '__main__':
    insider_manager = InsiderTradingManager()
    
    ticker = 'RELIANCE.NS'
    activity = insider_manager.get_insider_activity_for_ticker(ticker)
    
    print(f"Insider Trading Activity for {ticker} (last 90 days):")
    print(f"  - Total Buy Value: ₹{activity['buy_volume']:,.2f}")
    print(f"  - Total Sell Value: ₹{activity['sell_volume']:,.2f}")
    print(f"  - Net Activity: ₹{activity['net_activity']:,.2f}")
    print(f"  - Number of Trades: {activity['trade_count']}")
    
    print("\nSample of raw simulated data:")
    print(insider_manager.insider_data.head())
