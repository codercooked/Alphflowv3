"""
Social Media Data Manager for AlphaFlow
=======================================
This module simulates fetching and analyzing data from social media sources
like Twitter, Reddit, or StockTwits. It provides metrics on mention count
and overall sentiment, which can be leading indicators of market interest.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

class SocialMediaManager:
    def __init__(self):
        # In a real system, this would connect to social media APIs.
        # Here, we simulate the data.
        self.social_data = self._generate_dummy_data()

    def _generate_dummy_data(self):
        """
        Generates a DataFrame of plausible social media mentions.
        """
        tickers = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ZOMATO.NS']
        data = []
        today = datetime.now()
        
        for day in range(365): # One year of data
            current_date = today - timedelta(days=day)
            for ticker in tickers:
                mentions = np.random.randint(50, 1000) * (1 + np.random.rand())
                # Simulate higher sentiment for "hot" stocks
                if ticker == 'ZOMATO.NS':
                    sentiment_score = np.random.normal(0.6, 0.2)
                else:
                    sentiment_score = np.random.normal(0.2, 0.3)
                
                data.append({
                    'date': current_date,
                    'ticker': ticker,
                    'mentions': mentions,
                    'avg_sentiment': np.clip(sentiment_score, -1, 1)
                })
                
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        return df

    def get_social_trends_for_ticker(self, ticker, days_lookback=7):
        """
        Calculates social media trends for a ticker over a lookback period.
        
        :param ticker: The stock ticker.
        :param days_lookback: The number of past days to analyze.
        :return: A dictionary with trend metrics.
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_lookback)
        
        ticker_data = self.social_data[
            (self.social_data['ticker'] == ticker) &
            (self.social_data.index >= start_date)
        ]
        
        if ticker_data.empty:
            return {'avg_mentions': 0, 'mention_trend': 0, 'avg_sentiment': 0}
            
        avg_mentions = ticker_data['mentions'].mean()
        avg_sentiment = ticker_data['avg_sentiment'].mean()
        
        # Calculate mention trend (e.g., last 3 days vs. full period)
        if len(ticker_data) > 3:
            recent_mentions = ticker_data['mentions'].head(3).mean()
            mention_trend = (recent_mentions - avg_mentions) / avg_mentions if avg_mentions > 0 else 0
        else:
            mention_trend = 0
            
        return {
            'avg_mentions': avg_mentions,
            'mention_trend': mention_trend,
            'avg_sentiment': avg_sentiment
        }

if __name__ == '__main__':
    social_manager = SocialMediaManager()
    
    ticker = 'ZOMATO.NS'
    trends = social_manager.get_social_trends_for_ticker(ticker, days_lookback=30)
    
    print(f"Social Media Trends for {ticker} (last 30 days):")
    print(f"  - Average Daily Mentions: {trends['avg_mentions']:.0f}")
    print(f"  - Recent Mention Trend: {trends['mention_trend']:.2%}")
    print(f"  - Average Sentiment: {trends['avg_sentiment']:.3f}")
    
    print("\nSample of raw simulated data:")
    print(social_manager.social_data.head())
