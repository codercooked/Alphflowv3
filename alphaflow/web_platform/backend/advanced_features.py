"""
Advanced Feature Engineering for AlphaFlow
===========================================
This module provides functions to add more sophisticated, computationally
intensive, or experimental features to the dataset. These can include:
- Wavelet transforms for multi-resolution analysis
- Hurst Exponent for trend persistence analysis
- Fractal Dimension for complexity measurement
- And other statistical or signal processing features
"""

import numpy as np
import pandas as pd

# Safe import for pywt, as it's an optional dependency
try:
    import pywt
    PYWT_AVAILABLE = True
except ImportError:
    PYWT_AVAILABLE = False
    print("[advanced_features] WARNING: PyWavelets (pywt) not installed. Wavelet features will be unavailable.")

def add_wavelet_features(df, column='Close', wavelet='db4', level=4):
    """
    Adds Discrete Wavelet Transform (DWT) features to the dataframe.
    DWT is useful for analyzing signals at different frequency bands.
    
    :param df: Input DataFrame with a time series column.
    :param column: The name of the column to apply the transform on.
    :param wavelet: The type of wavelet to use (e.g., 'db4', 'haar').
    :param level: The level of decomposition.
    :return: DataFrame with added wavelet coefficient features.
    """
    if not PYWT_AVAILABLE or column not in df.columns:
        return df
        
    df = df.copy()
    signal = df[column].values
    
    # Decompose the signal
    coeffs = pywt.wavedec(signal, wavelet, level=level)
    
    # Add coefficients as features
    for i, c in enumerate(coeffs):
        # Pad the coefficient arrays to match the original signal length
        padded_c = np.pad(c, (len(signal) - len(c), 0), 'edge')
        df[f'wavelet_coeff_{i}'] = padded_c
        
    return df

def hurst_exponent(series, max_lag=100):
    """
    Calculates the Hurst Exponent of a time series.
    The Hurst Exponent is a measure of long-term memory of a time series.
    - H < 0.5: Mean-reverting series
    - H = 0.5: Geometric Brownian motion (random walk)
    - H > 0.5: Trending series
    
    :param series: A pandas Series or numpy array.
    :param max_lag: The maximum number of lags to use.
    :return: The Hurst Exponent as a float.
    """
    if len(series) < max_lag:
        return 0.5 # Not enough data

    lags = range(2, max_lag)
    tau = [np.sqrt(np.std(np.subtract(series[lag:], series[:-lag]))) for lag in lags]
    poly = np.polyfit(np.log(lags), np.log(tau), 1)
    return poly[0] * 2.0

def add_hurst_exponent_feature(df, column='Close', window=252):
    """
    Adds a rolling Hurst Exponent feature to the dataframe.
    
    :param df: Input DataFrame.
    :param column: The column to calculate the Hurst Exponent on.
    :param window: The rolling window size.
    :return: DataFrame with the Hurst Exponent feature.
    """
    if column not in df.columns:
        return df
        
    df = df.copy()
    df['hurst_exponent'] = df[column].rolling(window=window).apply(
        lambda x: hurst_exponent(x), raw=True
    )
    return df

def add_fractal_dimension_feature(df, column='Close', window=100):
    """
    Adds a rolling Fractal Dimension feature (using Higuchi's algorithm).
    Fractal dimension can measure the complexity of a time series.
    Higher values suggest more complexity and noise.
    
    :param df: Input DataFrame.
    :param column: The column to use.
    :param window: The rolling window size.
    :return: DataFrame with the fractal dimension feature.
    """
    # This is a simplified placeholder for Higuchi Fractal Dimension
    # A full implementation is more complex.
    if column not in df.columns:
        return df
        
    df = df.copy()
    df['fractal_dimension'] = df[column].rolling(window).apply(
        lambda x: np.log(np.abs(np.diff(x)).sum()) / np.log(window) if len(x) > 1 else 1.0,
        raw=True
    )
    return df

def add_advanced_features(df):
    """
    Main function to add all advanced features to the dataframe.
    """
    df = add_wavelet_features(df)
    df = add_hurst_exponent_feature(df)
    df = add_fractal_dimension_feature(df)
    
    # Fill any NaNs that might have been created
    df = df.fillna(method='ffill').fillna(method='bfill')
    
    return df

if __name__ == '__main__':
    # Example usage
    import yfinance as yf
    
    ticker = 'TCS.NS'
    data = yf.download(ticker, start='2020-01-01', end='2023-01-01')
    
    print(f"Original data shape: {data.shape}")
    
    advanced_df = add_advanced_features(data)
    
    print(f"Data with advanced features shape: {advanced_df.shape}")
    print("\nColumns added:")
    for col in advanced_df.columns:
        if col not in data.columns:
            print(f"- {col}")
            
    print("\nSample of the data with advanced features:")
    print(advanced_df[['Close', 'wavelet_coeff_0', 'hurst_exponent', 'fractal_dimension']].tail())
