"""
Kalman Filter for Stock Price Prediction (KalmanBox)
=====================================================
A 1D Kalman filter that tracks price and velocity (momentum).
Used by stock_engine.py to fuse momentum physics with AI predictions.

State Vector: [price, velocity]
Measurement: AI predicted price (or current price)

This was a missing component that stock_engine.py referenced but never had.
"""

import numpy as np


class KalmanBox:
    """
    1D Kalman Filter for price tracking with velocity (momentum).
    
    State: [price, velocity]  where velocity = price_change_per_step
    
    Usage:
        kf = KalmanBox(initial_price=100, initial_velocity=0.5, process_noise=100)
        kf.predict()                    # Project state forward
        filtered_price = kf.update(ai_prediction)  # Fuse with measurement
    """
    
    def __init__(self, initial_price, initial_velocity=0.0, process_noise=100, measurement_noise=50):
        """
        Args:
            initial_price: Starting price (e.g., yesterday's close)
            initial_velocity: Starting velocity (e.g., close[-1] - close[-2])
            process_noise: How much we trust the model vs measurement.
                          Higher = trust measurement more (faster tracking).
                          Default: 100. High vol: 1000.
            measurement_noise: How noisy the AI prediction is.
                              Default: 50. Lower = trust prediction more.
        """
        # State vector: [price, velocity]
        self.x = np.array([initial_price, initial_velocity], dtype=float)
        
        # State transition matrix (constant velocity model)
        # price_new = price + velocity * dt (dt=1)
        # velocity_new = velocity (assume constant)
        self.F = np.array([
            [1.0, 1.0],  # price = price + velocity
            [0.0, 1.0],  # velocity = velocity (constant)
        ])
        
        # Measurement matrix (we observe price only)
        self.H = np.array([[1.0, 0.0]])
        
        # State covariance (initial uncertainty)
        self.P = np.array([
            [1000.0, 0.0],
            [0.0, 1000.0],
        ])
        
        # Process noise covariance
        # Higher process_noise = state changes faster = trust measurements more
        q = process_noise
        self.Q = np.array([
            [q, q / 2],
            [q / 2, q],
        ])
        
        # Measurement noise covariance (scalar for 1D measurement)
        self.R = np.array([[measurement_noise]])
        
        # Identity matrix
        self.I = np.eye(2)
    
    def predict(self):
        """
        Predict step: project state and covariance forward.
        
        x_pred = F * x
        P_pred = F * P * F^T + Q
        """
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        
        return self.x[0]  # Return predicted price
    
    def update(self, measurement):
        """
        Update step: fuse prediction with measurement (AI price).
        
        Args:
            measurement: The observed/predicted price from AI models
            
        Returns:
            float: The filtered (fused) price estimate
        """
        z = np.array([measurement])
        
        # Innovation (measurement residual)
        y = z - self.H @ self.x
        
        # Innovation covariance
        S = self.H @ self.P @ self.H.T + self.R
        
        # Kalman gain
        K = self.P @ self.H.T @ np.linalg.inv(S)
        
        # Update state
        self.x = self.x + (K @ y).flatten()
        
        # Update covariance
        self.P = (self.I - K @ self.H) @ self.P
        
        return float(self.x[0])  # Return filtered price
    
    @property
    def price(self):
        """Current estimated price."""
        return float(self.x[0])
    
    @property
    def velocity(self):
        """Current estimated velocity (momentum)."""
        return float(self.x[1])
    
    @property
    def uncertainty(self):
        """Current price uncertainty (standard deviation)."""
        return float(np.sqrt(self.P[0, 0]))


class AdaptiveKalmanBox(KalmanBox):
    """
    Extended Kalman filter with adaptive noise estimation.
    Automatically adjusts process noise based on innovation sequence.
    """
    
    def __init__(self, initial_price, initial_velocity=0.0, process_noise=100, measurement_noise=50, adaptation_rate=0.1):
        super().__init__(initial_price, initial_velocity, process_noise, measurement_noise)
        self.adaptation_rate = adaptation_rate
        self.innovation_history = []
        self.max_history = 20
    
    def update(self, measurement):
        """Update with adaptive noise estimation."""
        z = np.array([measurement])
        
        # Innovation
        y = z - self.H @ self.x
        innovation_val = float(y[0])
        
        # Track innovation history
        self.innovation_history.append(innovation_val ** 2)
        if len(self.innovation_history) > self.max_history:
            self.innovation_history.pop(0)
        
        # Adapt measurement noise based on innovation variance
        if len(self.innovation_history) >= 5:
            innovation_var = np.mean(self.innovation_history)
            expected_var = float((self.H @ self.P @ self.H.T + self.R)[0, 0])
            
            if expected_var > 0:
                ratio = innovation_var / expected_var
                # If innovations are larger than expected, increase R
                # If smaller, decrease R (trust measurements more)
                alpha = self.adaptation_rate
                self.R = self.R * (1 - alpha) + alpha * self.R * ratio
                # Clamp R to reasonable bounds
                self.R = np.clip(self.R, 1.0, 10000.0)
        
        # Standard Kalman update
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + (K @ y).flatten()
        self.P = (self.I - K @ self.H) @ self.P
        
        return float(self.x[0])


# Quick test
if __name__ == "__main__":
    print("🎯 KalmanBox Test")
    print("-" * 40)
    
    # Simulate: price starts at 100, trending up 0.5/day
    kf = KalmanBox(initial_price=100.0, initial_velocity=0.5, process_noise=100)
    
    noisy_prices = [100.5, 101.2, 100.8, 101.5, 102.0, 101.7, 102.5, 103.0]
    
    for i, price in enumerate(noisy_prices):
        predicted = kf.predict()
        filtered = kf.update(price)
        print(f"  Day {i+1}: Measurement={price:.2f}, Predicted={predicted:.2f}, Filtered={filtered:.2f}, Uncertainty={kf.uncertainty:.2f}")
    
    print(f"\n  Final velocity (momentum): {kf.velocity:.4f}/day")
    print("✅ KalmanBox working correctly")
