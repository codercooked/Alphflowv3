import pandas as pd
import numpy as np

class OptionsStrategy:
    """
    Recommends options trading strategies based on AI signals.
    """
    
    def __init__(self):
        pass
    
    def recommend_option(self, signal, chain_data):
        """
        Recommends the best option based on the trading signal.
        
        Args:
            signal: dict with 'action', 'target', 'confidence', 'stop_loss'
            chain_data: dict from OptionsEngine with 'calls', 'puts', 'spot'
        
        Returns:
            dict with recommendation details
        """
        if not signal or not chain_data:
            return None
        
        action = signal.get('action', 'HOLD')
        target = signal.get('target', 0)
        spot = chain_data.get('spot', 0)
        confidence = signal.get('confidence', 0)
        
        if action == 'HOLD' or target == 0 or spot == 0:
            return None
        
        # Calculate expected move
        expected_move_pct = ((target - spot) / spot) * 100
        
        # Determine strategy
        if 'BUY' in action:
            return self._recommend_call(chain_data, spot, target, expected_move_pct, confidence)
        elif 'SELL' in action:
            return self._recommend_put(chain_data, spot, target, expected_move_pct, confidence)
        
        return None
    
    
    def _safe_round(self, val, decimals=2):
        try:
            if val is None: return 0.0
            if isinstance(val, (int, float)) and np.isnan(val): return 0.0
            return round(float(val), decimals)
        except:
            return 0.0

    def _recommend_call(self, chain_data, spot, target, expected_move_pct, confidence):
        """
        Recommend a Call option (bullish strategy).
        """
        calls = chain_data['calls']
        
        if calls.empty:
            return None
        
        # Strategy: Buy slightly OTM call for leverage
        # Target strike: Between spot and target price
        ideal_strike = spot + (target - spot) * 0.3  # 30% of the way to target
        
        # Find closest strike
        calls['strike_diff'] = abs(calls['strike'] - ideal_strike)
        best_call = calls.sort_values('strike_diff').iloc[0]
        
        # Calculate potential ROI
        premium = best_call.get('lastPrice', best_call.get('ask', 0))
        strike = best_call['strike']
        
        # If target is reached, intrinsic value = target - strike
        intrinsic_at_target = max(0, target - strike)
        expected_premium_at_target = intrinsic_at_target + (premium * 0.2)  # Some time value remains
        
        roi_pct = ((expected_premium_at_target - premium) / premium) * 100 if premium > 0 else 0
        
        return {
            'type': 'CALL',
            'symbol': f"{chain_data.get('expiry', '')} {strike} CE",
            'strike': strike,
            'premium': self._safe_round(premium, 2),
            'quantity_suggested': 1,  # Lot size would be fetched from exchange
            'investment': self._safe_round(premium, 2),
            'expected_value_at_target': self._safe_round(expected_premium_at_target, 2),
            'expected_roi': self._safe_round(roi_pct, 1),
            'confidence': confidence,
            'strategy': 'Long Call',
            'max_loss': self._safe_round(premium, 2),
            'breakeven': self._safe_round(strike + premium, 2),
            'reasoning': f"AI predicts {expected_move_pct:.1f}% upside. This call will profit if stock crosses ₹{strike + premium:.0f}."
        }
    
    def _recommend_put(self, chain_data, spot, target, expected_move_pct, confidence):
        """
        Recommend a Put option (bearish strategy).
        """
        puts = chain_data['puts']
        
        if puts.empty:
            return None
        
        # Strategy: Buy slightly OTM put
        ideal_strike = spot - (spot - target) * 0.3
        
        puts['strike_diff'] = abs(puts['strike'] - ideal_strike)
        best_put = puts.sort_values('strike_diff').iloc[0]
        
        premium = best_put.get('lastPrice', best_put.get('ask', 0))
        strike = best_put['strike']
        
        intrinsic_at_target = max(0, strike - target)
        expected_premium_at_target = intrinsic_at_target + (premium * 0.2)
        
        roi_pct = ((expected_premium_at_target - premium) / premium) * 100 if premium > 0 else 0
        
        return {
            'type': 'PUT',
            'symbol': f"{chain_data.get('expiry', '')} {strike} PE",
            'strike': strike,
            'premium': self._safe_round(premium, 2),
            'quantity_suggested': 1,
            'investment': self._safe_round(premium, 2),
            'expected_value_at_target': self._safe_round(expected_premium_at_target, 2),
            'expected_roi': self._safe_round(roi_pct, 1),
            'confidence': confidence,
            'strategy': 'Long Put',
            'max_loss': self._safe_round(premium, 2),
            'breakeven': self._safe_round(strike - premium, 2),
            'reasoning': f"AI predicts {abs(expected_move_pct):.1f}% downside. This put will profit if stock falls below ₹{strike - premium:.0f}."
        }
    
    def calculate_risk_reward(self, recommendation, signal):
        """
        Calculate risk-reward ratio for the option trade.
        """
        if not recommendation:
            return None
        
        max_loss = recommendation['max_loss']
        expected_profit = recommendation['expected_value_at_target'] - recommendation['premium']
        
        if max_loss > 0:
            rr_ratio = expected_profit / max_loss
        else:
            rr_ratio = 0
        
        return {
            'risk': max_loss,
            'reward': self._safe_round(expected_profit, 2),
            'ratio': self._safe_round(rr_ratio, 2)
        }
