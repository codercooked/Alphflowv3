"""
AlphaFlow ML & Deep Learning Model Training Pipeline
===================================================
This script fetches 5 years of daily data for the core Nifty 50 stocks,
engineers the exact features used by stock_engine.py, trains:
1. Random Forest (RF) Regressors
2. XGBoost (XGB) Regressors
3. LSTM Neural Networks (Deep Learning)
4. Transformer Attention Networks (Deep Learning)

It saves them all to the models/ folder and handles libraries dynamically.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error

# Add current directory to path so we can import stock_engine
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stock_engine

# List of core tickers to train
CORE_TICKERS = [
    'RELIANCE.NS',
    'TCS.NS',
    'HDFCBANK.NS',
    'INFY.NS',
    'SBIN.NS'
]

# Feature definitions matching stock_engine.py fallback block exactly
FEATURES_BASE = [
    'Open', 'High', 'Low', 'Volume', 
    'SMA_10', 'SMA_20', 'SMA_50', 
    'MACD', 'MACD_Signal', 'RSI', 
    'BB_High', 'BB_Low', 
    'ATR', 'Daily_Return',
    'VWMA', 'Volatility', 'RSI_Divergence',
    'CCI', 'Williams_R', 'ROC', 'VPT', 'CMO'
]

# LSTM Configuration
LSTM_FEATURES = ['Close', 'Volume', 'RSI', 'MACD', 'Volatility']
LSTM_SEQ_LEN = 10

def engineer_train_features(ticker, df):
    """
    Computes indicators, lags, date characteristics, and the target label.
    Identical to the fallback logic inside stock_engine.py.
    """
    df = df.copy()
    
    # 1. Inline indicators
    df = stock_engine._compute_technical_indicators_inline(df)
    
    # 2. Add lags 1 to 5
    feature_cols = list(FEATURES_BASE)
    for lag in range(1, 6):
        col_name = f'Lag_{lag}'
        df[col_name] = df['Close'].shift(lag)
        feature_cols.append(col_name)
        
    # 3. Date Features
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'])
    else:
        df['Date'] = pd.to_datetime(df.index)
        
    df['DayOfWeek'] = df['Date'].dt.dayofweek
    df['Month'] = df['Date'].dt.month
    df['DateOrdinal'] = df['Date'].apply(lambda x: x.toordinal())
    
    final_features = ['DateOrdinal', 'DayOfWeek', 'Month'] + feature_cols
    
    # 4. Target variables
    # For classical models & Transformer: Absolute next-day Close
    df['Target_Price'] = df['Close'].shift(-1)
    
    # For LSTM: Percentage change of next-day Close relative to current Close
    df['Target_Pct'] = (df['Close'].shift(-1) - df['Close']) / df['Close']
    
    # Fill remaining NaNs safely
    df = df.fillna(method='ffill').fillna(method='bfill').fillna(0)
    
    return df, final_features

def create_lstm_sequences(df, feature_names, seq_len):
    """
    Creates sequences of features and targets for LSTM training.
    X shape: [samples, seq_len, num_features]
    y shape: [samples]
    """
    X_seq, y_seq = [], []
    for i in range(seq_len - 1, len(df)):
        X_seq.append(df[feature_names].iloc[i - seq_len + 1 : i + 1].values)
        y_seq.append(df['Target_Pct'].iloc[i])
    return np.array(X_seq), np.array(y_seq)

def create_transformer_sequences(df, feature_names, seq_len):
    """
    Creates sequences of features and targets for Transformer training.
    X shape: [samples, seq_len, num_features]
    y shape: [samples]
    """
    X_seq, y_seq = [], []
    for i in range(seq_len - 1, len(df)):
        X_seq.append(df[feature_names].iloc[i - seq_len + 1 : i + 1].values)
        y_seq.append(df['Target_Price'].iloc[i])
    return np.array(X_seq), np.array(y_seq)

def train_stock_models(ticker, models_dir):
    """
    Downloads data, trains and saves RF, XGB, LSTM, and Transformer models.
    """
    clean_ticker = ticker.replace('.NS', '')
    print(f"\n{'='*75}")
    print(f" 🚀 STARTING FULL 4-MODEL TRAINING PIPELINE FOR: {ticker}")
    print(f"{'='*75}")
    
    # 1. Fetch historical data (5 Years)
    print(f"  [1/6] Fetching 5 years of daily data...")
    df_raw = stock_engine.get_stock_data(ticker, period="5y")
    if df_raw.empty or len(df_raw) < 150:
        print(f"  ❌ ERROR: Insufficient data for {ticker}")
        return False
    print(f"  ✅ Retrieved {len(df_raw)} trading days.")
    
    # 2. Feature Engineering
    print(f"  [2/6] Engineering base features...")
    df_feat, feature_names = engineer_train_features(ticker, df_raw)
    
    # Drop rows where targets are NaNs
    df_feat = df_feat.dropna(subset=feature_names + ['Target_Price', 'Target_Pct'])
    
    # --- MODEL 1: RANDOM FOREST ---
    print(f"  [3/6] Training Random Forest Regressor...")
    X_rf = df_feat[feature_names]
    y_rf = df_feat['Target_Price']
    
    rf_model = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    rf_model.fit(X_rf, y_rf)
    
    rf_path = os.path.join(models_dir, f"{clean_ticker}_rf_model.pkl")
    joblib.dump(rf_model, rf_path)
    print(f"        💾 RF saved to: {rf_path}")
    
    # --- MODEL 2: XGBOOST ---
    print(f"  [4/6] Training XGBoost Regressor...")
    try:
        from xgboost import XGBRegressor
        xgb_model = XGBRegressor(n_estimators=150, max_depth=6, learning_rate=0.04, random_state=42, n_jobs=-1)
        xgb_model.fit(X_rf, y_rf)
        xgb_path = os.path.join(models_dir, f"{clean_ticker}_xgb_model.pkl")
        joblib.dump(xgb_model, xgb_path)
        print(f"        💾 XGB saved to: {xgb_path}")
    except Exception as e:
        print(f"        ⚠️ XGBoost Bypassed: {e}")
        
    # Check if TensorFlow is available for Deep Learning models
    tf_available = False
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        tf_available = True
    except ImportError:
        print(f"  [5/6] ⚠️ Deep Learning models bypassed: TensorFlow is not fully installed yet.")
        return True
        
    # --- MODEL 3: LSTM ---
    print(f"  [5/6] Training Deep Learning LSTM Network...")
    try:
        # Scale LSTM features
        lstm_scaler = StandardScaler()
        df_lstm = df_feat.copy()
        df_lstm[LSTM_FEATURES] = lstm_scaler.fit_transform(df_lstm[LSTM_FEATURES])
        
        # Build sequences
        X_lstm, y_lstm = create_lstm_sequences(df_lstm, LSTM_FEATURES, LSTM_SEQ_LEN)
        
        # Chronological split for validation metric
        split_idx = int(len(X_lstm) * 0.8)
        X_train, X_val = X_lstm[:split_idx], X_lstm[split_idx:]
        y_train, y_val = y_lstm[:split_idx], y_lstm[split_idx:]
        
        # Define LSTM architecture
        lstm_model = models.Sequential([
            layers.Input(shape=(LSTM_SEQ_LEN, len(LSTM_FEATURES))),
            layers.LSTM(32, return_sequences=True),
            layers.Dropout(0.1),
            layers.LSTM(16),
            layers.Dropout(0.1),
            layers.Dense(1)
        ])
        lstm_model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.0015), loss='huber')
        
        # Train
        lstm_model.fit(X_train, y_train, epochs=25, batch_size=32, validation_data=(X_val, y_val), verbose=0)
        
        # Save model and artifacts (New format expects ticker with suffix)
        lstm_model_path = os.path.join(models_dir, f"{ticker}_lstm.keras")
        lstm_features_path = os.path.join(models_dir, f"{ticker}_lstm_features.json")
        lstm_scaler_path = os.path.join(models_dir, f"{ticker}_lstm_scaler.pkl")
        
        lstm_model.save(lstm_model_path)
        joblib.dump(lstm_scaler, lstm_scaler_path)
        
        # Save features metadata
        with open(lstm_features_path, 'w') as f:
            json.dump({"features": LSTM_FEATURES, "seq_length": LSTM_SEQ_LEN}, f)
            
        print(f"        💾 LSTM saved to: {lstm_model_path}")
        print(f"        💾 LSTM scalers saved successfully.")
        
    except Exception as e:
        print(f"        ❌ LSTM Training Failed: {e}")
        
    # --- MODEL 4: TRANSFORMER ---
    print(f"  [6/6] Training Deep Learning Transformer Network...")
    try:
        # Scale Transformer features & Target
        trans_feature_scaler = StandardScaler()
        trans_target_scaler = StandardScaler()
        
        df_trans = df_feat.copy()
        df_trans[feature_names] = trans_feature_scaler.fit_transform(df_trans[feature_names])
        df_trans['Target_Price_Scaled'] = trans_target_scaler.fit_transform(df_trans[['Target_Price']])
        
        # Sequence length 60 for Transformer
        trans_seq_len = 60
        
        # Build sequences
        # Scale features and targets separately
        X_trans, y_trans = [], []
        for i in range(trans_seq_len - 1, len(df_trans)):
            X_trans.append(df_trans[feature_names].iloc[i - trans_seq_len + 1 : i + 1].values)
            y_trans.append(df_trans['Target_Price_Scaled'].iloc[i])
            
        X_trans = np.array(X_trans)
        y_trans = np.array(y_trans)
        
        split_idx = int(len(X_trans) * 0.8)
        X_train, X_val = X_trans[:split_idx], X_trans[split_idx:]
        y_train, y_val = y_trans[:split_idx], y_trans[split_idx:]
        
        # Simple Multi-Head Attention architecture
        inputs = layers.Input(shape=(trans_seq_len, len(feature_names)))
        attn_out = layers.MultiHeadAttention(num_heads=2, key_dim=len(feature_names))(inputs, inputs)
        attn_out = layers.Dropout(0.1)(attn_out)
        x = layers.Add()([inputs, attn_out])
        x = layers.LayerNormalization(epsilon=1e-6)(x)
        x = layers.GlobalAveragePooling1D()(x)
        x = layers.Dense(32, activation='relu')(x)
        outputs = layers.Dense(1)(x)
        
        trans_model = models.Model(inputs=inputs, outputs=outputs)
        trans_model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), loss='mse')
        
        # Train
        trans_model.fit(X_train, y_train, epochs=25, batch_size=32, validation_data=(X_val, y_val), verbose=0)
        
        # Save model and artifacts (Expects clean_ticker format)
        trans_model_path = os.path.join(models_dir, f"{clean_ticker}_transformer.keras")
        trans_features_path = os.path.join(models_dir, f"{clean_ticker}_transformer_features.pkl")
        trans_feature_scaler_path = os.path.join(models_dir, f"{clean_ticker}_transformer_feature_scaler.pkl")
        trans_target_scaler_path = os.path.join(models_dir, f"{clean_ticker}_transformer_target_scaler.pkl")
        
        trans_model.save(trans_model_path)
        joblib.dump(feature_names, trans_features_path)
        joblib.dump(trans_feature_scaler, trans_feature_scaler_path)
        joblib.dump(trans_target_scaler, trans_target_scaler_path)
        
        print(f"        💾 Transformer saved to: {trans_model_path}")
        print(f"        💾 Transformer scalers saved successfully.")
        
    except Exception as e:
        print(f"        ❌ Transformer Training Failed: {e}")
        
    print(f"  ✅ Finished {ticker} full training pipeline!")
    return True

if __name__ == '__main__':
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(backend_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    print("=" * 80)
    print("             ALPHAFLOW COMPLETE 4-MODEL ENSEMBLE TRAINING SYSTEM")
    print("=" * 80)
    print(f"Target Directory: {models_dir}")
    print(f"Tickers:          {', '.join(CORE_TICKERS)}")
    print(f"Start Time:       {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    success_count = 0
    for ticker in CORE_TICKERS:
        try:
            if train_stock_models(ticker, models_dir):
                success_count += 1
        except Exception as ex:
            print(f"  ❌ FATAL ERROR training {ticker}: {ex}")
            
    print("\n" + "=" * 80)
    print(f"  🏆 TRAINING COMPLETION REPORT")
    print("=" * 80)
    print(f"  ├── Tickers Processed: {len(CORE_TICKERS)}")
    print(f"  ├── Successfully Trained: {success_count}/{len(CORE_TICKERS)}")
    print(f"  ├── Save Path: {models_dir}")
    print(f"  └── End Time:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
