"""
AlphaFlow Prediction Accuracy Test
====================================
This script performs a walk-forward backtest to evaluate the accuracy of the
_advanced_ta_predict engine in stock_engine.py. It iterates through historical
data, makes predictions for each day using only past data (no look-ahead bias),
and compares them against the actual outcomes.

Now uses the native df_override parameter — no monkey-patching needed.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import sys
import os

# Suppress verbose debug output
import warnings
warnings.filterwarnings("ignore")

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stock_engine
import joblib
import json

# Cache dictionary to avoid reloading models on every iteration
_model_cache = {}

def get_real_ml_predictions(lookback, ticker):
    """
    Loads trained ML models for the ticker from the models/ folder and uses
    them to make out-of-sample predictions on the lookback data.
    Uses caching to avoid reloading files.
    """
    clean_ticker = ticker.replace('.NS', '')
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    
    # Check cache first
    if ticker not in _model_cache:
        # Load models and scalers
        cache_entry = {
            'rf': None,
            'xgb': None,
            'lstm': None,
            'lstm_scaler': None,
            'transformer': None,
            'trans_feature_scaler': None,
            'trans_target_scaler': None
        }
        
        # 1. XGBoost
        xgb_path = os.path.join(models_dir, f"{clean_ticker}_xgb_model.pkl")
        if os.path.exists(xgb_path):
            try:
                cache_entry['xgb'] = joblib.load(xgb_path)
            except Exception as e:
                print(f"  [Cache Load] Error loading XGB model: {e}")
                
        # 2. Random Forest
        rf_path = os.path.join(models_dir, f"{clean_ticker}_rf_model.pkl")
        if os.path.exists(rf_path):
            try:
                cache_entry['rf'] = joblib.load(rf_path)
            except Exception as e:
                print(f"  [Cache Load] Error loading RF model: {e}")
                
        # 3. LSTM
        lstm_path = os.path.join(models_dir, f"{ticker}_lstm.keras")
        lstm_scaler_path = os.path.join(models_dir, f"{ticker}_lstm_scaler.pkl")
        if os.path.exists(lstm_path) and os.path.exists(lstm_scaler_path):
            try:
                import tensorflow as tf
                cache_entry['lstm'] = tf.keras.models.load_model(lstm_path)
                cache_entry['lstm_scaler'] = joblib.load(lstm_scaler_path)
            except Exception as e:
                print(f"  [Cache Load] Error loading LSTM model: {e}")
                
        # 4. Transformer
        trans_path = os.path.join(models_dir, f"{clean_ticker}_transformer.keras")
        trans_feature_scaler_path = os.path.join(models_dir, f"{clean_ticker}_transformer_feature_scaler.pkl")
        trans_target_scaler_path = os.path.join(models_dir, f"{clean_ticker}_transformer_target_scaler.pkl")
        if os.path.exists(trans_path) and os.path.exists(trans_feature_scaler_path) and os.path.exists(trans_target_scaler_path):
            try:
                import tensorflow as tf
                cache_entry['transformer'] = tf.keras.models.load_model(trans_path)
                cache_entry['trans_feature_scaler'] = joblib.load(trans_feature_scaler_path)
                cache_entry['trans_target_scaler'] = joblib.load(trans_target_scaler_path)
            except Exception as e:
                print(f"  [Cache Load] Error loading Transformer model: {e}")
                
        _model_cache[ticker] = cache_entry

    # Extract cached items
    models = _model_cache[ticker]
    
    # 5. Feature Engineering on the current lookback dataframe
    df_feat = stock_engine._compute_technical_indicators_inline(lookback)
    
    features_base = [
        'Open', 'High', 'Low', 'Volume', 
        'SMA_10', 'SMA_20', 'SMA_50', 
        'MACD', 'MACD_Signal', 'RSI', 
        'BB_High', 'BB_Low', 
        'ATR', 'Daily_Return',
        'VWMA', 'Volatility', 'RSI_Divergence',
        'CCI', 'Williams_R', 'ROC', 'VPT', 'CMO'
    ]
    
    feature_cols = list(features_base)
    for lag in range(1, 6):
        col_name = f'Lag_{lag}'
        df_feat[col_name] = df_feat['Close'].shift(lag)
        feature_cols.append(col_name)
        
    if 'Date' in df_feat.columns:
        df_feat['Date'] = pd.to_datetime(df_feat['Date'])
    else:
        df_feat['Date'] = pd.to_datetime(df_feat.index)
        
    df_feat['DayOfWeek'] = df_feat['Date'].dt.dayofweek
    df_feat['Month'] = df_feat['Date'].dt.month
    df_feat['DateOrdinal'] = df_feat['Date'].apply(lambda x: x.toordinal())
    
    final_features = ['DateOrdinal', 'DayOfWeek', 'Month'] + feature_cols
    
    # Fill remaining NaNs safely
    df_feat = df_feat.fillna(method='ffill').fillna(method='bfill').fillna(0)
    
    # Select last row for single prediction
    prediction_features = df_feat[final_features].iloc[[-1]]
    prev_close = float(lookback['Close'].iloc[-1])
    
    # Predict outputs
    predictions = {}
    
    # 1. XGBoost Predict
    if models['xgb'] is not None:
        try:
            predictions['xgboost'] = float(models['xgb'].predict(prediction_features)[0])
        except Exception:
            pass
            
    # 2. RF Predict
    if models['rf'] is not None:
        try:
            predictions['rf'] = float(models['rf'].predict(prediction_features)[0])
        except Exception:
            pass
            
    # 3. LSTM Predict
    if models['lstm'] is not None and models['lstm_scaler'] is not None:
        try:
            lstm_features = ['Close', 'Volume', 'RSI', 'MACD', 'Volatility']
            lstm_seq_len = 10
            if len(df_feat) >= lstm_seq_len:
                lstm_data = df_feat[lstm_features].iloc[-lstm_seq_len:].values
                lstm_data = models['lstm_scaler'].transform(lstm_data)
                lstm_input = np.expand_dims(lstm_data, axis=0)
                lstm_pred_scaled = models['lstm'].predict(lstm_input, verbose=0)
                pct_change_pred = float(lstm_pred_scaled[0][0])
                predictions['lstm'] = prev_close * (1 + pct_change_pred)
        except Exception:
            pass
            
    # 4. Transformer Predict
    if models['transformer'] is not None and models['trans_feature_scaler'] is not None and models['trans_target_scaler'] is not None:
        try:
            trans_seq_len = 60
            if len(df_feat) >= trans_seq_len:
                trans_data = df_feat[final_features].iloc[-trans_seq_len:].values
                trans_data = models['trans_feature_scaler'].transform(trans_data)
                trans_input = np.expand_dims(trans_data, axis=0)
                trans_pred_scaled = models['transformer'].predict(trans_input, verbose=0)
                predictions['transformer'] = float(models['trans_target_scaler'].inverse_transform(trans_pred_scaled)[0][0])
        except Exception:
            pass
            
    return predictions


def get_highly_polished_predictions(lookback, ticker):
    """
    Executes the exact advanced predictive pipeline used in production:
    - Featurizes lookback data
    - Obtains out-of-sample raw ML predictions
    - Calculates dynamic weights based on recent performance
    - Performs adaptive bias correction (PID-like feedback)
    - Updates Kalman Filter state with bias-corrected base prediction
    - Runs the complete advanced pipeline (GARCH + Monte Carlo + BMA + SuperBlend)
    """
    clean_ticker = ticker.replace('.NS', '')
    
    # 1. Fetch raw ML predictions (ensures models are cached/loaded)
    real_preds = get_real_ml_predictions(lookback, ticker)
    
    # 2. Extract cached elements
    models = _model_cache[ticker]
    
    # Re-run features pipeline to get complete feature dataframe for dynamic weighting & bias
    df_feat = stock_engine._compute_technical_indicators_inline(lookback)
    
    features_base = [
        'Open', 'High', 'Low', 'Volume', 
        'SMA_10', 'SMA_20', 'SMA_50', 
        'MACD', 'MACD_Signal', 'RSI', 
        'BB_High', 'BB_Low', 
        'ATR', 'Daily_Return',
        'VWMA', 'Volatility', 'RSI_Divergence',
        'CCI', 'Williams_R', 'ROC', 'VPT', 'CMO'
    ]
    
    feature_cols = list(features_base)
    for lag in range(1, 6):
        col_name = f'Lag_{lag}'
        df_feat[col_name] = df_feat['Close'].shift(lag)
        feature_cols.append(col_name)
        
    if 'Date' in df_feat.columns:
        df_feat['Date'] = pd.to_datetime(df_feat['Date'])
    else:
        df_feat['Date'] = pd.to_datetime(df_feat.index)
        
    df_feat['DayOfWeek'] = df_feat['Date'].dt.dayofweek
    df_feat['Month'] = df_feat['Date'].dt.month
    df_feat['DateOrdinal'] = df_feat['Date'].apply(lambda x: x.toordinal())
    
    final_features = ['DateOrdinal', 'DayOfWeek', 'Month'] + feature_cols
    df_feat = df_feat.fillna(method='ffill').fillna(method='bfill').fillna(0)
    
    # Base fallback price (momentum/TA base prediction)
    prev_close = float(lookback['Close'].iloc[-1])
    ta_result = stock_engine._advanced_ta_predict(lookback, prev_close)
    predicted_price = ta_result['pred_close']
    
    # Prepare model dicts and predictions
    loaded_models = {}
    preds = {}
    if 'xgboost' in real_preds:
        preds['xgb'] = real_preds['xgboost']
        loaded_models['xgb'] = models['xgb']
    if 'rf' in real_preds:
        preds['rf'] = real_preds['rf']
        loaded_models['rf'] = models['rf']
    if 'lstm' in real_preds:
        preds['lstm'] = real_preds['lstm']
        loaded_models['lstm'] = models['lstm']
    if 'transformer' in real_preds:
        preds['transformer'] = real_preds['transformer']
        loaded_models['transformer'] = models['transformer']
        
    # Reconstruct correct model_preds shape for pipeline
    model_preds_pipeline = {
        'xgboost': real_preds.get('xgboost', ta_result.get('xgb_target', predicted_price)),
        'rf': real_preds.get('rf', ta_result.get('rf_target', predicted_price)),
        'lstm': real_preds.get('lstm', ta_result.get('lstm_target', predicted_price)),
        'transformer': real_preds.get('transformer', ta_result.get('dt_target', predicted_price)),
    }
    
    # 3. Dynamic weight calculation
    dynamic_weights = {'xgb': 0.4, 'rf': 0.3, 'lstm': 0.3} # Default
    if len(loaded_models) > 0:
        try:
            dynamic_weights = stock_engine.calculate_model_weights(df_feat, loaded_models, final_features, None)
            dynamic_weights = stock_engine.get_sector_adjusted_weights(dynamic_weights, ticker)
            
            for model_name in dynamic_weights:
                vol_mult = stock_engine.get_volatility_regime_multiplier(df_feat, model_name)
                dynamic_weights[model_name] *= vol_mult
                
            total_w = sum(dynamic_weights.values())
            if total_w > 0:
                dynamic_weights = {k: v/total_w for k, v in dynamic_weights.items()}
        except Exception:
            pass
            
    # 4. Weighted base prediction
    final_pred = 0
    valid_weights = 0
    for name, model in loaded_models.items():
        weight = dynamic_weights.get(name, 0)
        pred = preds.get(name, 0)
        if not np.isnan(pred) and not np.isnan(weight):
            final_pred += pred * weight
            valid_weights += weight
            
    if valid_weights > 0:
        base_ml_price = final_pred / valid_weights
    else:
        base_ml_price = predicted_price
        
    # 5. Bias Correction Calculation
    bias = 0.0
    correction_gain = 0.7
    try:
        if len(df_feat) >= 3:
            # T-1 Bias
            prev_features = df_feat[final_features].iloc[[-2]]
            p_xgb_prev = loaded_models['xgb'].predict(prev_features)[0] if 'xgb' in loaded_models else 0
            p_rf_prev = loaded_models['rf'].predict(prev_features)[0] if 'rf' in loaded_models else 0
            
            p_lstm_prev, p_trans_prev = 0, 0
            if 'lstm' in loaded_models and len(df_feat) >= 12:
                lstm_features = ['Close', 'Volume', 'RSI', 'MACD', 'Volatility']
                lstm_prev_input = np.expand_dims(df_feat[lstm_features].iloc[-11:-1].values, axis=0)
                lstm_prev_input = models['lstm_scaler'].transform(lstm_prev_input[0])
                lstm_prev_input = np.expand_dims(lstm_prev_input, axis=0)
                p_lstm_prev_scaled = loaded_models['lstm'].predict(lstm_prev_input, verbose=0)
                p_lstm_prev = float(df_feat['Close'].iloc[-2] * (1 + float(p_lstm_prev_scaled[0][0])))
                
            if 'transformer' in loaded_models and len(df_feat) >= 61:
                trans_prev_input = np.expand_dims(df_feat[final_features].iloc[-61:-1].values, axis=0)
                trans_prev_input = models['trans_feature_scaler'].transform(trans_prev_input[0])
                trans_prev_input = np.expand_dims(trans_prev_input, axis=0)
                p_trans_prev_scaled = loaded_models['transformer'].predict(trans_prev_input, verbose=0)
                p_trans_prev = float(models['trans_target_scaler'].inverse_transform(p_trans_prev_scaled)[0][0])
                
            active_count = 0
            raw_sum = 0
            if 'xgb' in loaded_models and p_xgb_prev > 0: raw_sum += p_xgb_prev; active_count += 1
            if 'rf' in loaded_models and p_rf_prev > 0: raw_sum += p_rf_prev; active_count += 1
            if 'lstm' in loaded_models and p_lstm_prev > 0: raw_sum += p_lstm_prev; active_count += 1
            if 'transformer' in loaded_models and p_trans_prev > 0: raw_sum += p_trans_prev; active_count += 1
            
            if active_count > 0:
                pred_prev = raw_sum / active_count
                actual_prev = df_feat['Close'].iloc[-2]
                bias = actual_prev - pred_prev
                
            # T-2 Bias (Momentum/Trend check)
            if len(df_feat) >= 4:
                p_xgb_2 = loaded_models['xgb'].predict(df_feat[final_features].iloc[[-3]])[0] if 'xgb' in loaded_models else 0
                p_rf_2 = loaded_models['rf'].predict(df_feat[final_features].iloc[[-3]])[0] if 'rf' in loaded_models else 0
                
                p_lstm_2, p_trans_2 = 0, 0
                if 'lstm' in loaded_models and len(df_feat) >= 13:
                    lstm_features = ['Close', 'Volume', 'RSI', 'MACD', 'Volatility']
                    lstm_2_input = np.expand_dims(df_feat[lstm_features].iloc[-12:-2].values, axis=0)
                    lstm_2_input = models['lstm_scaler'].transform(lstm_2_input[0])
                    lstm_2_input = np.expand_dims(lstm_2_input, axis=0)
                    p_lstm_2_scaled = loaded_models['lstm'].predict(lstm_2_input, verbose=0)
                    p_lstm_2 = float(df_feat['Close'].iloc[-3] * (1 + float(p_lstm_2_scaled[0][0])))
                    
                if 'transformer' in loaded_models and len(df_feat) >= 62:
                    trans_2_input = np.expand_dims(df_feat[final_features].iloc[-62:-2].values, axis=0)
                    trans_2_input = models['trans_feature_scaler'].transform(trans_2_input[0])
                    trans_2_input = np.expand_dims(trans_2_input, axis=0)
                    p_trans_2_scaled = loaded_models['transformer'].predict(trans_2_input, verbose=0)
                    p_trans_2 = float(models['trans_target_scaler'].inverse_transform(p_trans_2_scaled)[0][0])
                    
                raw_sum_2 = 0
                active_count_2 = 0
                if 'xgb' in loaded_models and p_xgb_2 > 0: raw_sum_2 += p_xgb_2; active_count_2 += 1
                if 'rf' in loaded_models and p_rf_2 > 0: raw_sum_2 += p_rf_2; active_count_2 += 1
                if 'lstm' in loaded_models and p_lstm_2 > 0: raw_sum_2 += p_lstm_2; active_count_2 += 1
                if 'transformer' in loaded_models and p_trans_2 > 0: raw_sum_2 += p_trans_2; active_count_2 += 1
                
                if active_count_2 > 0:
                    pred_prev_2 = raw_sum_2 / active_count_2
                    bias_2 = df_feat['Close'].iloc[-3] - pred_prev_2
                    
                    if np.sign(bias) == np.sign(bias_2):
                        correction_gain = 1.1
                    else:
                        correction_gain = 0.3
    except Exception:
        pass
        
    bias_corrected_ml_price = base_ml_price + (bias * correction_gain)
    
    # 6. Kalman Filter Update
    kalman_price = None
    try:
        p_t1 = float(lookback['Close'].iloc[-1])
        p_t2 = float(lookback['Close'].iloc[-2]) if len(lookback) >= 2 else p_t1
        velocity = p_t1 - p_t2
        
        current_vol = float(df_feat['Volatility'].iloc[-1])
        q_noise = 1000 if current_vol > 0.025 else 100
        
        kf = stock_engine.KalmanBox(initial_price=p_t1, initial_velocity=velocity, process_noise=q_noise)
        kf.predict()
        kalman_price = kf.update(bias_corrected_ml_price)
    except Exception:
        kalman_price = None
        
    # 7. Run Super-Blend Pipeline
    try:
        adv = stock_engine.run_full_advanced_pipeline(
            current_price=prev_close,
            historical_df=lookback,
            model_predictions=model_preds_pipeline,
            kalman_price=kalman_price,
        )
        if adv and 'super_blend' in adv:
            sb_price = adv['super_blend'].get('final_prediction')
            if sb_price and sb_price > 0:
                return sb_price
    except Exception:
        pass
        
    return predicted_price


def run_backtest(ticker, test_period_days=90, verbose=False):
    """
    Performs a walk-forward backtest for a given ticker.

    :param ticker: The stock ticker to test (e.g., 'RELIANCE.NS').
    :param test_period_days: The number of recent days to use for the backtest.
    :param verbose: If True, print per-day predictions.
    :return: A dictionary with accuracy metrics.
    """
    print(f"\n{'='*60}")
    print(f"  Backtesting: {ticker} ({test_period_days} days)")
    print(f"{'='*60}")

    # Fetch data — need extra history for indicators
    try:
        full_data = stock_engine.get_stock_data(ticker, period="5y")
        if full_data.empty or len(full_data) < test_period_days + 60:
            print(f"  ERROR: Not enough data for {ticker}")
            return None
    except Exception as e:
        print(f"  ERROR: Failed to fetch data for {ticker}: {e}")
        return None

    # Compute features on the full dataset once
    try:
        full_featured = stock_engine._get_data_with_features(ticker, df_override=full_data)
        if full_featured.empty:
            print(f"  ERROR: Feature engineering failed for {ticker}")
            return None
    except Exception as e:
        print(f"  ERROR: Feature engineering failed: {e}")
        return None

    predictions = []
    actuals = []
    errors = []
    direction_correct = 0
    direction_total = 0

    start_time = time.time()

    # Walk-forward: predict each day using only data up to that point
    for i in range(test_period_days, 0, -1):
        try:
            target_idx = -i
            actual_price = float(full_featured['Close'].iloc[target_idx])
            
            # Data available at prediction time (everything before target day)
            lookback = full_featured.iloc[:target_idx]
            
            if len(lookback) < 60:
                continue

            prev_close = float(lookback['Close'].iloc[-1])
            
            # Run the complete, high-fidelity advanced pipeline (Dynamic Weighting + Bias Correction + Kalman Filter + Super-Blend)
            predicted_price = get_highly_polished_predictions(lookback, ticker)
            
            # Store results
            predictions.append(predicted_price)
            actuals.append(actual_price)
            
            error_pct = abs(actual_price - predicted_price) / actual_price * 100
            errors.append(error_pct)
            
            # Direction accuracy
            pred_up = predicted_price > prev_close
            actual_up = actual_price > prev_close
            if pred_up == actual_up:
                direction_correct += 1
            direction_total += 1

            if verbose:
                direction_ok = "✓" if pred_up == actual_up else "✗"
                date_str = pd.to_datetime(full_featured.index[target_idx]).strftime('%Y-%m-%d')
                print(f"  {date_str}: Pred={predicted_price:>10.2f}  Actual={actual_price:>10.2f}  "
                      f"Err={error_pct:.2f}%  Dir={direction_ok}")
                
        except Exception as e:
            if verbose:
                print(f"  Skipped day {i}: {e}")
            continue

    elapsed = time.time() - start_time

    # Calculate metrics
    if not predictions:
        print(f"  No predictions generated for {ticker}")
        return None

    predictions = np.array(predictions)
    actuals = np.array(actuals)
    errors = np.array(errors)
    
    mape = np.mean(errors)
    rmse = np.sqrt(np.mean((predictions - actuals)**2))
    mae = np.mean(np.abs(predictions - actuals))
    max_error = np.max(errors)
    median_error = np.median(errors)
    dir_accuracy = (direction_correct / direction_total * 100) if direction_total > 0 else 0
    avg_acc_score = np.mean([max(0, 100 - e) for e in errors])

    # Print Report
    print(f"\n  📊 Results for {ticker}:")
    print(f"  ├── Days tested:          {len(predictions)}")
    print(f"  ├── MAPE:                 {mape:.3f}%")
    print(f"  ├── Median Error:         {median_error:.3f}%")
    print(f"  ├── Max Error:            {max_error:.3f}%")
    print(f"  ├── RMSE:                 ₹{rmse:.2f}")
    print(f"  ├── MAE:                  ₹{mae:.2f}")
    print(f"  ├── Direction Accuracy:   {dir_accuracy:.1f}% ({direction_correct}/{direction_total})")
    print(f"  ├── Avg Accuracy Score:   {avg_acc_score:.1f}%")
    print(f"  └── Time:                 {elapsed:.1f}s")

    return {
        'ticker': ticker,
        'days_tested': len(predictions),
        'mape': round(mape, 3),
        'median_error': round(median_error, 3),
        'max_error': round(max_error, 3),
        'rmse': round(rmse, 2),
        'mae': round(mae, 2),
        'direction_accuracy': round(dir_accuracy, 1),
        'avg_accuracy_score': round(avg_acc_score, 1),
        'time_seconds': round(elapsed, 1)
    }


if __name__ == '__main__':
    # Test multiple major NSE stocks
    test_tickers = [
        'RELIANCE.NS',
        'TCS.NS',
        'HDFCBANK.NS',
        'INFY.NS',
        'SBIN.NS',
    ]
    
    test_days = 60  # 60-day backtest per stock
    
    print("=" * 60)
    print("  AlphaFlow Prediction Accuracy Backtest")
    print("  Engine: TA + GARCH + Monte Carlo + Bayesian + SuperBlend")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    all_results = []
    
    for ticker in test_tickers:
        result = run_backtest(ticker, test_period_days=test_days, verbose=False)
        if result:
            all_results.append(result)
    
    # Summary table
    if all_results:
        print("\n" + "=" * 80)
        print("  OVERALL SUMMARY")
        print("=" * 80)
        print(f"  {'Ticker':<15} {'MAPE%':<10} {'Median%':<10} {'RMSE':<10} {'Dir.Acc%':<10} {'Score%':<10}")
        print(f"  {'-'*65}")
        
        total_mape = 0
        total_dir = 0
        total_score = 0
        
        for r in all_results:
            print(f"  {r['ticker']:<15} {r['mape']:<10} {r['median_error']:<10} "
                  f"{r['rmse']:<10} {r['direction_accuracy']:<10} {r['avg_accuracy_score']:<10}")
            total_mape += r['mape']
            total_dir += r['direction_accuracy']
            total_score += r['avg_accuracy_score']
        
        n = len(all_results)
        print(f"  {'-'*65}")
        print(f"  {'AVERAGE':<15} {total_mape/n:<10.3f} {'':10} {'':10} "
              f"{total_dir/n:<10.1f} {total_score/n:<10.1f}")
        print(f"\n  ✅ Backtest complete. {n} stocks tested.")
