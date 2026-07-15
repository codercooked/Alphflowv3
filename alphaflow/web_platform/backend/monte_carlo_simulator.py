"""
Monte Carlo Stock Price & Option Pricing Simulator
====================================================
Integrated from: https://github.com/tubakhxn/Monte-Carlo-Option-Pricing-Simulator

Features:
- Simulate future stock price paths using Geometric Brownian Motion (GBM)
- Price European Call/Put options via Monte Carlo simulation
- Calculate Black-Scholes analytical prices for comparison
- Generate price forecasts with confidence intervals

Author: Integrated by AI System
Original: tubakhxn (MIT License)
"""

import numpy as np
import pandas as pd
from math import erf, exp, pi, sqrt
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional


class _Norm:
    @staticmethod
    def cdf(x):
        return 0.5 * (1.0 + erf(x / sqrt(2.0)))

    @staticmethod
    def pdf(x):
        return exp(-0.5 * x * x) / sqrt(2.0 * pi)


norm = _Norm()

# =============================================================================
# Geometric Brownian Motion (GBM) Simulation
# =============================================================================

def simulate_gbm_paths(
    S0: float,
    r: float,
    sigma: float,
    T: float,
    steps: int = 252,
    n_paths: int = 1000
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simulate stock price paths using Geometric Brownian Motion.
    
    Stock price evolution:
    S_t = S_0 * exp((r - 0.5*σ²)t + σ*W_t)
    
    Args:
        S0: Initial stock price
        r: Risk-free rate (annual, e.g., 0.05 for 5%)
        sigma: Volatility (annual, e.g., 0.2 for 20%)
        T: Time to maturity in years (e.g., 1.0 for 1 year)
        steps: Number of time steps (252 = trading days in a year)
        n_paths: Number of simulation paths
    
    Returns:
        t: Time array
        paths: Array of shape (n_paths, steps+1) with simulated prices
    """
    dt = T / steps
    t = np.linspace(0, T, steps + 1)
    paths = np.zeros((n_paths, steps + 1))
    paths[:, 0] = S0
    
    for i in range(n_paths):
        W = np.random.standard_normal(steps)
        W = np.cumsum(W) * np.sqrt(dt)
        X = (r - 0.5 * sigma ** 2) * t[1:] + sigma * W
        paths[i, 1:] = S0 * np.exp(X)
    
    return t, paths


def simulate_stock_forecast(
    current_price: float,
    volatility: float,
    risk_free_rate: float = 0.06,
    days_ahead: int = 30,
    n_simulations: int = 10000
) -> Dict:
    """
    Generate stock price forecast using Monte Carlo simulation.
    
    Args:
        current_price: Current stock price
        volatility: Historical volatility (annualized)
        risk_free_rate: Risk-free rate (default 6% for India)
        days_ahead: Number of days to forecast
        n_simulations: Number of Monte Carlo simulations
    
    Returns:
        Dictionary with forecast statistics and paths
    """
    T = days_ahead / 252  # Convert to years
    
    # Simulate paths
    t, paths = simulate_gbm_paths(
        S0=current_price,
        r=risk_free_rate,
        sigma=volatility,
        T=T,
        steps=days_ahead,
        n_paths=n_simulations
    )
    
    # Get final prices
    final_prices = paths[:, -1]
    
    # Calculate statistics
    mean_price = np.mean(final_prices)
    median_price = np.median(final_prices)
    std_price = np.std(final_prices)
    
    # Confidence intervals
    ci_95_lower = np.percentile(final_prices, 2.5)
    ci_95_upper = np.percentile(final_prices, 97.5)
    ci_80_lower = np.percentile(final_prices, 10)
    ci_80_upper = np.percentile(final_prices, 90)
    
    # Probability calculations
    prob_up = np.mean(final_prices > current_price)
    prob_up_5pct = np.mean(final_prices > current_price * 1.05)
    prob_down_5pct = np.mean(final_prices < current_price * 0.95)
    
    # Expected return
    expected_return = (mean_price / current_price - 1) * 100
    
    return {
        'current_price': current_price,
        'days_ahead': days_ahead,
        'n_simulations': n_simulations,
        'volatility': volatility,
        'risk_free_rate': risk_free_rate,
        
        # Price forecasts
        'mean_price': mean_price,
        'median_price': median_price,
        'std_price': std_price,
        'expected_return_pct': expected_return,
        
        # Confidence intervals
        'ci_95': (ci_95_lower, ci_95_upper),
        'ci_80': (ci_80_lower, ci_80_upper),
        
        # Probabilities
        'prob_up': prob_up,
        'prob_up_5pct': prob_up_5pct,
        'prob_down_5pct': prob_down_5pct,
        
        # Sample paths for visualization (first 100)
        'sample_paths': paths[:100, :],
        'time_points': t * 252,  # Convert back to days
    }


# =============================================================================
# Option Pricing Functions
# =============================================================================

def monte_carlo_option_price(
    paths: np.ndarray,
    K: float,
    r: float,
    T: float,
    option_type: str = 'call'
) -> float:
    """
    Calculate European option price using Monte Carlo simulation.
    
    Args:
        paths: Simulated price paths (n_paths, steps)
        K: Strike price
        r: Risk-free rate
        T: Time to maturity
        option_type: 'call' or 'put'
    
    Returns:
        Option price
    """
    S_T = paths[:, -1]  # Final prices
    
    if option_type == 'call':
        payoff = np.maximum(S_T - K, 0)
    else:
        payoff = np.maximum(K - S_T, 0)
    
    # Discount to present value
    price = np.exp(-r * T) * np.mean(payoff)
    return price


def black_scholes_price(
    S0: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
    option_type: str = 'call'
) -> float:
    """
    Calculate European option price using Black-Scholes formula.
    
    Call: C = S₀N(d₁) - Ke^(-rT)N(d₂)
    Put:  P = Ke^(-rT)N(-d₂) - S₀N(-d₁)
    
    Where:
    d₁ = [ln(S₀/K) + (r + 0.5σ²)T] / (σ√T)
    d₂ = d₁ - σ√T
    
    Args:
        S0: Current stock price
        K: Strike price
        r: Risk-free rate
        sigma: Volatility
        T: Time to maturity
        option_type: 'call' or 'put'
    
    Returns:
        Option price
    """
    if T <= 0:
        # At expiry
        if option_type == 'call':
            return max(S0 - K, 0)
        else:
            return max(K - S0, 0)
    
    d1 = (np.log(S0 / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if option_type == 'call':
        price = S0 * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        price = K * np.exp(-r * T) * norm.cdf(-d2) - S0 * norm.cdf(-d1)
    
    return price


def calculate_option_greeks(
    S0: float,
    K: float,
    r: float,
    sigma: float,
    T: float,
    option_type: str = 'call'
) -> Dict:
    """
    Calculate option Greeks.
    
    Args:
        S0: Current stock price
        K: Strike price
        r: Risk-free rate
        sigma: Volatility
        T: Time to maturity
        option_type: 'call' or 'put'
    
    Returns:
        Dictionary with Delta, Gamma, Theta, Vega, Rho
    """
    if T <= 0:
        return {
            'delta': 1.0 if option_type == 'call' and S0 > K else 0.0,
            'gamma': 0.0,
            'theta': 0.0,
            'vega': 0.0,
            'rho': 0.0
        }
    
    d1 = (np.log(S0 / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    # Delta
    if option_type == 'call':
        delta = norm.cdf(d1)
    else:
        delta = norm.cdf(d1) - 1
    
    # Gamma (same for call and put)
    gamma = norm.pdf(d1) / (S0 * sigma * np.sqrt(T))
    
    # Theta (daily)
    theta_part1 = -(S0 * norm.pdf(d1) * sigma) / (2 * np.sqrt(T))
    if option_type == 'call':
        theta = theta_part1 - r * K * np.exp(-r * T) * norm.cdf(d2)
    else:
        theta = theta_part1 + r * K * np.exp(-r * T) * norm.cdf(-d2)
    theta = theta / 365  # Convert to daily
    
    # Vega (for 1% change in volatility)
    vega = S0 * norm.pdf(d1) * np.sqrt(T) / 100
    
    # Rho (for 1% change in interest rate)
    if option_type == 'call':
        rho = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
    else:
        rho = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100
    
    return {
        'delta': delta,
        'gamma': gamma,
        'theta': theta,
        'vega': vega,
        'rho': rho
    }


def price_options_monte_carlo(
    current_price: float,
    strike_prices: List[float],
    volatility: float,
    days_to_expiry: int,
    risk_free_rate: float = 0.06,
    n_simulations: int = 10000
) -> pd.DataFrame:
    """
    Price multiple options using Monte Carlo simulation.
    
    Args:
        current_price: Current stock price
        strike_prices: List of strike prices
        volatility: Historical volatility (annualized)
        days_to_expiry: Days until option expiry
        risk_free_rate: Risk-free rate
        n_simulations: Number of simulations
    
    Returns:
        DataFrame with option prices
    """
    T = days_to_expiry / 252
    
    # Simulate paths once
    _, paths = simulate_gbm_paths(
        S0=current_price,
        r=risk_free_rate,
        sigma=volatility,
        T=T,
        steps=days_to_expiry,
        n_paths=n_simulations
    )
    
    results = []
    for K in strike_prices:
        # Monte Carlo prices
        mc_call = monte_carlo_option_price(paths, K, risk_free_rate, T, 'call')
        mc_put = monte_carlo_option_price(paths, K, risk_free_rate, T, 'put')
        
        # Black-Scholes prices
        bs_call = black_scholes_price(current_price, K, risk_free_rate, volatility, T, 'call')
        bs_put = black_scholes_price(current_price, K, risk_free_rate, volatility, T, 'put')
        
        # Greeks
        call_greeks = calculate_option_greeks(current_price, K, risk_free_rate, volatility, T, 'call')
        put_greeks = calculate_option_greeks(current_price, K, risk_free_rate, volatility, T, 'put')
        
        # Moneyness
        moneyness = current_price / K
        if moneyness > 1.02:
            call_status = 'ITM'
            put_status = 'OTM'
        elif moneyness < 0.98:
            call_status = 'OTM'
            put_status = 'ITM'
        else:
            call_status = 'ATM'
            put_status = 'ATM'
        
        results.append({
            'strike': K,
            'call_mc': mc_call,
            'call_bs': bs_call,
            'call_diff': mc_call - bs_call,
            'call_delta': call_greeks['delta'],
            'call_gamma': call_greeks['gamma'],
            'call_theta': call_greeks['theta'],
            'call_status': call_status,
            'put_mc': mc_put,
            'put_bs': bs_put,
            'put_diff': mc_put - bs_put,
            'put_delta': put_greeks['delta'],
            'put_status': put_status,
        })
    
    return pd.DataFrame(results)


# =============================================================================
# Stock Price Prediction using Monte Carlo
# =============================================================================

def monte_carlo_prediction(
    ticker: str,
    current_price: float,
    historical_data: pd.DataFrame,
    days_ahead: int = 1,
    n_simulations: int = 10000
) -> Dict:
    """
    Generate stock price prediction using Monte Carlo simulation.
    
    Args:
        ticker: Stock symbol
        current_price: Current stock price
        historical_data: DataFrame with historical OHLCV data
        days_ahead: Days to forecast
        n_simulations: Number of simulations
    
    Returns:
        Prediction dictionary
    """
    # Calculate historical volatility
    if 'Close' in historical_data.columns:
        returns = historical_data['Close'].pct_change().dropna()
        volatility = returns.std() * np.sqrt(252)  # Annualize
        avg_return = returns.mean() * 252  # Annualized return
    else:
        volatility = 0.25  # Default 25%
        avg_return = 0.10  # Default 10%
    
    # Risk-free rate (India ~6%)
    risk_free_rate = 0.06
    
    # Generate forecast
    forecast = simulate_stock_forecast(
        current_price=current_price,
        volatility=volatility,
        risk_free_rate=risk_free_rate,
        days_ahead=days_ahead,
        n_simulations=n_simulations
    )
    
    # Generate prediction
    predicted_price = forecast['mean_price']
    
    # Confidence-weighted prediction (blend mean and median)
    weighted_prediction = 0.6 * forecast['mean_price'] + 0.4 * forecast['median_price']
    
    return {
        'ticker': ticker,
        'current_price': current_price,
        'predicted_price': predicted_price,
        'weighted_prediction': weighted_prediction,
        'prediction_date': (datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d'),
        
        # Confidence intervals
        'ci_95_low': forecast['ci_95'][0],
        'ci_95_high': forecast['ci_95'][1],
        'ci_80_low': forecast['ci_80'][0],
        'ci_80_high': forecast['ci_80'][1],
        
        # Statistics
        'expected_return_pct': forecast['expected_return_pct'],
        'volatility': volatility,
        'prob_up': forecast['prob_up'],
        'prob_up_5pct': forecast['prob_up_5pct'],
        'prob_down_5pct': forecast['prob_down_5pct'],
        
        # Signal
        'signal': 'BUY' if forecast['prob_up'] > 0.55 else ('SELL' if forecast['prob_up'] < 0.45 else 'HOLD'),
        'confidence': abs(forecast['prob_up'] - 0.5) * 2,  # 0-1 scale
        
        # Simulation details
        'n_simulations': n_simulations,
    }


def analyze_stock_with_monte_carlo(
    ticker: str,
    historical_df: pd.DataFrame,
    strike_prices: List[float] = None
) -> Dict:
    """
    Complete Monte Carlo analysis for a stock including price forecast and option pricing.
    
    Args:
        ticker: Stock symbol
        historical_df: Historical OHLCV data
        strike_prices: Optional list of strike prices for option pricing
    
    Returns:
        Complete analysis dictionary
    """
    if historical_df is None or len(historical_df) < 20:
        return {'error': 'Insufficient historical data'}
    
    current_price = historical_df['Close'].iloc[-1]
    
    # Calculate volatility
    returns = historical_df['Close'].pct_change().dropna()
    volatility = returns.std() * np.sqrt(252)
    
    # Price predictions for different horizons
    predictions = {}
    for days in [1, 5, 10, 20, 30]:
        pred = monte_carlo_prediction(
            ticker=ticker,
            current_price=current_price,
            historical_data=historical_df,
            days_ahead=days,
            n_simulations=10000
        )
        predictions[f'{days}d'] = pred
    
    # Option pricing (if strike prices provided or use ATM ± 10%)
    if strike_prices is None:
        strike_prices = [
            current_price * 0.90,
            current_price * 0.95,
            current_price,  # ATM
            current_price * 1.05,
            current_price * 1.10,
        ]
    
    options_30d = price_options_monte_carlo(
        current_price=current_price,
        strike_prices=strike_prices,
        volatility=volatility,
        days_to_expiry=30,
        n_simulations=10000
    )
    
    return {
        'ticker': ticker,
        'current_price': current_price,
        'volatility': volatility,
        'volatility_pct': volatility * 100,
        'predictions': predictions,
        'options_30d': options_30d.to_dict('records'),
        'analysis_time': datetime.now().isoformat(),
    }


# =============================================================================
# Utility Functions
# =============================================================================

def calculate_historical_volatility(prices: pd.Series, window: int = 20) -> float:
    """Calculate historical volatility from price series."""
    returns = prices.pct_change().dropna()
    volatility = returns.rolling(window=window).std() * np.sqrt(252)
    return volatility.iloc[-1] if len(volatility) > 0 else 0.25


def get_implied_volatility(
    option_price: float,
    S0: float,
    K: float,
    r: float,
    T: float,
    option_type: str = 'call',
    max_iterations: int = 100
) -> float:
    """
    Calculate implied volatility using Newton-Raphson method.
    
    Args:
        option_price: Market price of the option
        S0: Current stock price
        K: Strike price
        r: Risk-free rate
        T: Time to maturity
        option_type: 'call' or 'put'
        max_iterations: Maximum iterations
    
    Returns:
        Implied volatility
    """
    sigma = 0.25  # Initial guess
    tolerance = 1e-5
    
    for _ in range(max_iterations):
        price = black_scholes_price(S0, K, r, sigma, T, option_type)
        diff = price - option_price
        
        if abs(diff) < tolerance:
            return sigma
        
        # Vega for Newton-Raphson
        d1 = (np.log(S0 / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        vega = S0 * norm.pdf(d1) * np.sqrt(T)
        
        if vega < 1e-10:
            break
        
        sigma = sigma - diff / vega
        sigma = max(0.01, min(sigma, 5.0))  # Bounds
    
    return sigma


if __name__ == "__main__":
    # Example usage
    print("=" * 60)
    print("🎲 Monte Carlo Stock Price & Option Pricing Simulator")
    print("=" * 60)
    
    # Example: Forecast Reliance stock
    S0 = 2500  # Current price
    volatility = 0.25  # 25% annual volatility
    
    print(f"\n📊 Stock Price Forecast for ₹{S0}")
    print("-" * 40)
    
    forecast = simulate_stock_forecast(
        current_price=S0,
        volatility=volatility,
        days_ahead=30,
        n_simulations=10000
    )
    
    print(f"Current Price: ₹{forecast['current_price']:,.2f}")
    print(f"30-Day Forecast (Mean): ₹{forecast['mean_price']:,.2f}")
    print(f"Expected Return: {forecast['expected_return_pct']:+.2f}%")
    print(f"95% Confidence Interval: ₹{forecast['ci_95'][0]:,.2f} - ₹{forecast['ci_95'][1]:,.2f}")
    print(f"Probability Up: {forecast['prob_up']*100:.1f}%")
    
    # Option pricing
    print(f"\n📈 Option Pricing (30-day expiry)")
    print("-" * 40)
    
    options = price_options_monte_carlo(
        current_price=S0,
        strike_prices=[2300, 2400, 2500, 2600, 2700],
        volatility=volatility,
        days_to_expiry=30
    )
    
    print(options[['strike', 'call_mc', 'call_bs', 'put_mc', 'put_bs']].to_string(index=False))
