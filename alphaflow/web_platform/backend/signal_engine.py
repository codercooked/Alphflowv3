import pandas as pd
import numpy as np

class SignalEngine:
    def __init__(self):
        # Precise Sector Multipliers (Sovereign v13.4 - The Vault)
        self.sector_map = {
            "IT": {"sl": 1.5, "tp": 2.2, "rsi_in": (40, 58)},
            "BANK": {"sl": 1.4, "tp": 2.0, "rsi_in": (40, 56)},
            "DEFAULT": {"sl": 1.5, "tp": 2.0, "rsi_in": (40, 56)}
        }
    
    def _calculate_indicators(self, df):
        c = df['Close']
        df['SMA20'] = c.rolling(20).mean()
        df['SMA50'] = c.rolling(50).mean()
        df['SMA200'] = c.rolling(200).mean()
        
        h = df['High']; l = df['Low']; cp = c.shift(1)
        tr = pd.concat([h-l, (h-cp).abs(), (l-cp).abs()], axis=1).max(axis=1)
        df['ATR'] = tr.rolling(14).mean()
        df['ATR_MA20'] = df['ATR'].rolling(20).mean()
        
        diff = c.diff()
        gain = diff.where(diff > 0, 0).rolling(14).mean()
        loss = (-diff.where(diff < 0, 0)).rolling(14).mean()
        df['RSI'] = 100 - (100 / (1 + (gain / loss.replace(0, 0.001))))
        return df

    def generate_signal(self, ticker, df, curr_p, pred_data, df_n=None):
        try:
            # 1. THE VAULT PROTECTION (Hard Market Filter)
            # ------------------------------------------
            df_n = self._calculate_indicators(df_n)
            n_row = df_n.iloc[-1]
            n_c = n_row['Close']
            
            # Absolute Market Veto
            if n_c < n_row['SMA20'] or n_c < n_row['SMA50']: 
                return None
            
            # Volatility Circuit Breaker
            v_ratio = n_row['ATR'] / (n_row['ATR_MA20'] + 1e-6)
            if v_ratio > 1.3: return None # TOTAL REJECT in high stress
            
            # 2. PARAMETERS
            t = ticker.replace(".NS", "").upper()
            cfg = self.sector_map.get("IT" if t in ["TCS", "INFY"] else "BANK" if t in ["SBIN", "HDFCBANK"] else "DEFAULT")
            
            # 3. SETUP VERIFICATION
            # --------------------
            df = self._calculate_indicators(df)
            row = df.iloc[-1]
            rsi = row['RSI']
            sma20 = row['SMA20']
            
            # Stability Check: Stock must be above SMA50 for the last 3 days
            if (df['Close'].iloc[-3:] < df['SMA50'].iloc[-3:]).any(): return None
            
            # Stretch Limit: Don't buy if price > 2.5% from SMA20
            if (curr_p - sma20) / sma20 > 0.025: return None
            
            # Triple-Lock RSI Entry
            r_min, r_max = cfg['rsi_in']
            r_hist = df['RSI'].iloc[-5:]
            if not (r_min < rsi < r_max): return None
            if rsi < r_hist.min() + 4: return None # Stronger Hook Required
            
            # 4. SIGNAL OUTPUT
            reasons = ["Vault Guard Active", "Multi-Day Trend Stabilized", "Precision RSI Hook"]
            
            signal = {
                "ticker": ticker, "action": "SOVEREIGN BUY", "confidence": 0.99,
                "reason": reasons, "score": 10.0, "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            atr = row['ATR']
            signal['stop_loss'] = curr_p - (cfg['sl'] * atr)
            signal['target'] = curr_p + (cfg['tp'] * atr)
            
            return signal
        except: return None
