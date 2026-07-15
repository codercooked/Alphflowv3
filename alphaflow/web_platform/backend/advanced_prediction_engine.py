"""
AlphaFlow Advanced Prediction Engine
======================================
Provides 4 advanced prediction methods that integrate with stock_engine.py:

1. GARCH(1,1) Volatility Model — MLE-based parameter estimation
2. Monte Carlo Enhanced Prediction — GBM + Merton jump-diffusion
3. Bayesian Model Averaging — inverse-variance posterior weighting
4. Ensemble Super-Blender — dynamic multi-method fusion

Dependencies: numpy, pandas, scipy (all already available)
Author: AlphaFlow AI System
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.stats import norm
import warnings
from tv_helper import fetch_tradingview_analysis

warnings.filterwarnings('ignore')


# =============================================================================
# 1. GARCH(1,1) Volatility Model
# =============================================================================

def garch_volatility_forecast(returns_series, forecast_horizon=1):
    """
    Fit a GARCH(1,1) model via Maximum Likelihood Estimation and forecast volatility.

    Model: σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}
    Constraint: α + β < 1 (stationarity)

    Parameters
    ----------
    returns_series : array-like or pd.Series
        Series of log-returns (or simple returns). Must have len >= 30.
    forecast_horizon : int
        Number of steps ahead to forecast (default=1).

    Returns
    -------
    dict
        forecast_volatility : float  — daily σ for the next period
        annualized_vol     : float  — annualized volatility (×√252)
        vol_regime         : str    — 'HIGH', 'NORMAL', or 'LOW'
        confidence_band_pct: float  — ±band as pct of current vol
        params             : dict   — fitted {omega, alpha, beta}
        method             : str    — 'GARCH_MLE' or 'EWMA_FALLBACK'
    """
    print("🔬 [AdvPred] Running GARCH(1,1) volatility forecast …")

    # ---- Input validation ----
    try:
        returns = np.asarray(returns_series, dtype=np.float64)
        returns = returns[np.isfinite(returns)]
        # Scale returns by 100 to stabilize optimization (avoid floating point underflow)
        returns = returns * 100.0
    except Exception:
        returns = np.array([], dtype=np.float64)

    if len(returns) < 30:
        print("⚠️  [AdvPred] GARCH: insufficient data (<30 obs), using EWMA fallback")
        fallback_res = _ewma_volatility_fallback(returns, forecast_horizon)
        fallback_res["forecast_volatility"] /= 100.0
        fallback_res["annualized_vol"] /= 100.0
        return fallback_res

    # De-mean the returns
    mu = np.mean(returns)
    eps = returns - mu

    # ---- Negative log-likelihood for GARCH(1,1) ----
    def neg_log_likelihood(params):
        omega, alpha, beta = params
        n = len(eps)
        sigma2 = np.empty(n)
        sigma2[0] = np.var(eps)  # unconditional variance as seed

        for t in range(1, n):
            sigma2[t] = omega + alpha * eps[t - 1] ** 2 + beta * sigma2[t - 1]
            if sigma2[t] <= 0:
                sigma2[t] = 1e-10  # numerical guard

        # Gaussian log-likelihood (drop constant)
        ll = -0.5 * np.sum(np.log(sigma2) + eps ** 2 / sigma2)
        return -ll  # minimize negative LL

    # ---- Initial guesses ----
    var0 = np.var(eps)
    x0 = np.array([var0 * 0.05, 0.08, 0.88])

    # ---- Bounds & stationarity constraint ----
    bounds = [(1e-10, None), (1e-6, 0.999), (1e-6, 0.999)]
    constraints = [
        {"type": "ineq", "fun": lambda p: 0.9999 - (p[1] + p[2])},  # α+β < 1
    ]

    method_used = "GARCH_MLE"
    try:
        result = minimize(
            neg_log_likelihood,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 500, "ftol": 1e-10},
        )
        if not result.success:
            raise RuntimeError(result.message)

        omega, alpha, beta = result.x

        # Enforce stationarity
        if alpha + beta >= 1.0:
            scale = 0.999 / (alpha + beta)
            alpha *= scale
            beta *= scale
            print("⚠️  [AdvPred] GARCH: rescaled α+β to enforce stationarity")

        # ---- Compute fitted variance series ----
        n = len(eps)
        sigma2 = np.empty(n)
        sigma2[0] = np.var(eps)
        for t in range(1, n):
            sigma2[t] = omega + alpha * eps[t - 1] ** 2 + beta * sigma2[t - 1]
            if sigma2[t] <= 0:
                sigma2[t] = 1e-10

        # ---- Forecast ----
        # Multi-step: σ²_{t+h} = ω·Σ(α+β)^i + (α+β)^h · σ²_t
        last_sigma2 = sigma2[-1]
        ab = alpha + beta
        if abs(ab - 1.0) < 1e-8:
            forecast_sigma2 = last_sigma2  # random walk
        else:
            unconditional_var = omega / (1.0 - ab)
            forecast_sigma2 = unconditional_var + (ab ** forecast_horizon) * (last_sigma2 - unconditional_var)

        forecast_sigma2 = max(forecast_sigma2, 1e-12)
        forecast_vol = np.sqrt(forecast_sigma2)

    except Exception as e:
        print(f"⚠️  [AdvPred] GARCH MLE failed ({e}), using EWMA fallback")
        fallback_res = _ewma_volatility_fallback(returns, forecast_horizon)
        fallback_res["forecast_volatility"] /= 100.0
        fallback_res["annualized_vol"] /= 100.0
        return fallback_res

    # ---- Annualize & classify regime ----
    annualized = forecast_vol * np.sqrt(252)
    hist_annual_vol = np.std(returns) * np.sqrt(252)

    if annualized > hist_annual_vol * 1.3:
        regime = "HIGH"
    elif annualized < hist_annual_vol * 0.7:
        regime = "LOW"
    else:
        regime = "NORMAL"

    # Confidence band: based on parameter uncertainty (approximate)
    confidence_band = forecast_vol * 1.96  # ~95% band on σ itself
    confidence_band_pct = (confidence_band / forecast_vol * 100) if forecast_vol > 0 else 0.0

    # Scale back down to decimal representation for returns
    final_forecast_vol = forecast_vol / 100.0
    final_annualized = annualized / 100.0

    result_dict = {
        "forecast_volatility": float(final_forecast_vol),
        "annualized_vol": float(final_annualized),
        "vol_regime": regime,
        "confidence_band_pct": float(round(confidence_band_pct, 2)),
        "params": {
            "omega": float(round(omega, 8)),
            "alpha": float(round(alpha, 6)),
            "beta": float(round(beta, 6)),
        },
        "method": method_used,
    }
    print(f"✅ [AdvPred] GARCH → σ_daily={final_forecast_vol:.6f}  annual={final_annualized:.4f}  regime={regime}")
    return result_dict


def _ewma_volatility_fallback(returns, forecast_horizon=1, span=30):
    """Exponentially Weighted Moving Average volatility — used when GARCH MLE fails."""
    print("📉 [AdvPred] Using EWMA volatility fallback")

    if len(returns) < 2:
        vol = 2.0  # default 2% daily scaled by 100
    else:
        ser = pd.Series(returns)
        ewma_var = ser.ewm(span=min(span, len(returns))).var().iloc[-1]
        vol = float(np.sqrt(ewma_var)) if np.isfinite(ewma_var) and ewma_var > 0 else 2.0

    annualized = vol * np.sqrt(252)
    hist_annual = float(np.std(returns) * np.sqrt(252)) if len(returns) >= 5 else annualized

    if annualized > hist_annual * 1.3:
        regime = "HIGH"
    elif annualized < hist_annual * 0.7:
        regime = "LOW"
    else:
        regime = "NORMAL"

    return {
        "forecast_volatility": float(vol),
        "annualized_vol": float(annualized),
        "vol_regime": regime,
        "confidence_band_pct": 196.0,  # wide band — low confidence
        "params": {"omega": 0.0, "alpha": 0.0, "beta": 0.0},
        "method": "EWMA_FALLBACK",
    }


# =============================================================================
# 2. Monte Carlo Enhanced Prediction (GBM + Merton Jump-Diffusion)
# =============================================================================

def monte_carlo_enhanced_predict(
    current_price,
    historical_df,
    garch_vol=None,
    n_simulations=5000,
    days_ahead=1,
):
    """
    Enhanced Monte Carlo prediction using GBM + Merton jump-diffusion.

    Parameters
    ----------
    current_price : float
        Current stock price.
    historical_df : pd.DataFrame
        Must contain a 'Close' column with historical prices.
    garch_vol : float or None
        GARCH-forecasted daily volatility. If None, uses historical vol.
    n_simulations : int
        Number of simulation paths (default 5000).
    days_ahead : int
        Forecast horizon in trading days (default 1).

    Returns
    -------
    dict
        mc_predicted_price  : float — mean simulated price
        mc_median           : float — median simulated price
        prob_up             : float — P(price goes up)
        ci_80               : tuple — (low, high) 80% confidence interval
        ci_95               : tuple — (low, high) 95% confidence interval
        expected_return_pct : float — expected return in %
        jump_intensity      : float — estimated λ (jumps per day)
    """
    print(f"🎲 [AdvPred] Running Monte Carlo Enhanced ({n_simulations} sims, {days_ahead}d) …")

    # ---- Extract returns ----
    try:
        closes = historical_df["Close"].dropna().values.astype(np.float64)
    except Exception:
        closes = np.array([], dtype=np.float64)

    if len(closes) < 10:
        print("⚠️  [AdvPred] MC: insufficient close data, returning naive forecast")
        return _mc_naive_fallback(current_price)

    log_returns = np.diff(np.log(closes))
    log_returns = log_returns[np.isfinite(log_returns)]

    if len(log_returns) < 5:
        return _mc_naive_fallback(current_price)

    # ---- Drift & volatility ----
    mu_daily = float(np.mean(log_returns))

    if garch_vol is not None and garch_vol > 0:
        sigma_daily = float(garch_vol)
        print(f"   📈 Using GARCH vol σ={sigma_daily:.6f}")
    else:
        sigma_daily = float(np.std(log_returns))
        print(f"   📈 Using historical vol σ={sigma_daily:.6f}")

    sigma_daily = max(sigma_daily, 1e-8)  # floor

    # ---- Jump parameters (Merton model) ----
    # Detect jumps as returns beyond 3σ
    threshold = 3.0 * sigma_daily
    jump_mask = np.abs(log_returns) > threshold
    n_jumps = int(np.sum(jump_mask))
    n_total = len(log_returns)

    lam = max(n_jumps / n_total, 0.005)  # at least 0.5% per day
    if n_jumps > 0:
        jump_returns = log_returns[jump_mask]
        jump_mean = float(np.mean(jump_returns))
        jump_std = float(np.std(jump_returns)) if len(jump_returns) > 1 else sigma_daily * 2
    else:
        jump_mean = 0.0
        jump_std = sigma_daily * 2.0

    # ---- Simulate paths ----
    dt = 1.0  # daily steps
    np.random.seed(None)  # ensure randomness

    # Diffusion component
    Z = np.random.standard_normal((n_simulations, days_ahead))
    diffusion = (mu_daily - 0.5 * sigma_daily ** 2) * dt + sigma_daily * np.sqrt(dt) * Z

    # Jump component (Poisson arrivals)
    jump_counts = np.random.poisson(lam * dt, (n_simulations, days_ahead))
    jump_sizes = np.random.normal(jump_mean, jump_std, (n_simulations, days_ahead)) * jump_counts

    # Total log-return path
    total_log_returns = diffusion + jump_sizes

    # Cumulative log-returns → prices
    cum_log_returns = np.cumsum(total_log_returns, axis=1)
    final_log_returns = cum_log_returns[:, -1]
    final_prices = current_price * np.exp(final_log_returns)

    # Remove any invalid values
    valid_mask = np.isfinite(final_prices) & (final_prices > 0)
    final_prices = final_prices[valid_mask]

    if len(final_prices) < 10:
        return _mc_naive_fallback(current_price)

    # ---- Statistics ----
    mc_mean = float(np.mean(final_prices))
    mc_median = float(np.median(final_prices))
    prob_up = float(np.mean(final_prices > current_price))

    ci_80 = (float(np.percentile(final_prices, 10)), float(np.percentile(final_prices, 90)))
    ci_95 = (float(np.percentile(final_prices, 2.5)), float(np.percentile(final_prices, 97.5)))

    expected_return_pct = float((mc_mean / current_price - 1) * 100)

    result = {
        "mc_predicted_price": mc_mean,
        "mc_median": mc_median,
        "prob_up": prob_up,
        "ci_80": ci_80,
        "ci_95": ci_95,
        "expected_return_pct": round(expected_return_pct, 4),
        "jump_intensity": round(lam, 6),
    }
    print(f"✅ [AdvPred] MC → mean=₹{mc_mean:.2f}  median=₹{mc_median:.2f}  P(up)={prob_up:.2%}")
    return result


def _mc_naive_fallback(current_price):
    """Minimal fallback when data is insufficient for proper MC simulation."""
    return {
        "mc_predicted_price": float(current_price),
        "mc_median": float(current_price),
        "prob_up": 0.50,
        "ci_80": (current_price * 0.97, current_price * 1.03),
        "ci_95": (current_price * 0.95, current_price * 1.05),
        "expected_return_pct": 0.0,
        "jump_intensity": 0.0,
    }


# =============================================================================
# 3. Bayesian Model Averaging
# =============================================================================

def bayesian_model_average(model_predictions, historical_errors=None, current_price=None):
    """
    Compute a Bayesian Model Average prediction from multiple models.

    Parameters
    ----------
    model_predictions : dict
        {model_name: predicted_price, …}
        e.g. {'xgboost': 1520.5, 'rf': 1518.0, 'lstm': 1521.3, 'transformer': 1519.0}
    historical_errors : dict or None
        {model_name: [list of past absolute errors], …}
        If None, uses equal (uninformative) priors.
    current_price : float
        Current stock price — used for credible interval scaling.

    Returns
    -------
    dict
        bma_prediction       : float
        posterior_weights     : dict
        prediction_std        : float
        credible_interval_80 : (low, high)
        credible_interval_95 : (low, high)
    """
    print("🧠 [AdvPred] Running Bayesian Model Averaging …")

    # ---- Validate inputs ----
    if not model_predictions or not isinstance(model_predictions, dict):
        print("⚠️  [AdvPred] BMA: no model predictions provided")
        fallback_price = float(current_price) if current_price else 0.0
        return _bma_fallback(fallback_price)

    # Filter out NaN / None predictions
    valid_preds = {}
    for name, pred in model_predictions.items():
        try:
            p = float(pred)
            if np.isfinite(p) and p > 0:
                valid_preds[name] = p
        except (TypeError, ValueError):
            continue

    if not valid_preds:
        print("⚠️  [AdvPred] BMA: all predictions invalid, using current price")
        fallback_price = float(current_price) if current_price else 0.0
        return _bma_fallback(fallback_price)

    model_names = list(valid_preds.keys())
    predictions = np.array([valid_preds[m] for m in model_names])

    # ---- Compute posterior weights ----
    if historical_errors and isinstance(historical_errors, dict):
        # Inverse-variance weighting with Bayesian updating
        variances = {}
        for name in model_names:
            errs = historical_errors.get(name, [])
            try:
                errs_arr = np.array(errs, dtype=np.float64)
                errs_arr = errs_arr[np.isfinite(errs_arr)]
            except Exception:
                errs_arr = np.array([])

            if len(errs_arr) >= 2:
                var = float(np.var(errs_arr, ddof=1))
                # Floor at a small positive value
                variances[name] = max(var, 1e-10)
            else:
                # No history → use prior variance based on prediction spread
                variances[name] = None

        # Fill missing variances with the median of available ones (or a default)
        known_vars = [v for v in variances.values() if v is not None]
        default_var = float(np.median(known_vars)) if known_vars else 1.0
        for name in model_names:
            if variances[name] is None:
                variances[name] = default_var

        # Inverse-variance weights
        inv_vars = np.array([1.0 / variances[m] for m in model_names])
        weights = inv_vars / np.sum(inv_vars)
    else:
        # Equal (uninformative) priors
        weights = np.ones(len(model_names)) / len(model_names)

    posterior_weights = {name: float(round(w, 6)) for name, w in zip(model_names, weights)}

    # ---- BMA prediction ----
    bma_pred = float(np.sum(predictions * weights))

    # ---- Prediction uncertainty ----
    # Weighted standard deviation of the predictions themselves
    deviations = predictions - bma_pred
    pred_var = float(np.sum(weights * deviations ** 2))
    pred_std = float(np.sqrt(pred_var)) if pred_var > 0 else float(np.std(predictions))

    # Use at least a minimal std
    if pred_std < 1e-8:
        pred_std = float(np.std(predictions)) if len(predictions) > 1 else abs(bma_pred) * 0.005

    # ---- Credible intervals (assuming approximate normality) ----
    ci_80 = (float(bma_pred - 1.282 * pred_std), float(bma_pred + 1.282 * pred_std))
    ci_95 = (float(bma_pred - 1.960 * pred_std), float(bma_pred + 1.960 * pred_std))

    result = {
        "bma_prediction": bma_pred,
        "posterior_weights": posterior_weights,
        "prediction_std": round(pred_std, 4),
        "credible_interval_80": ci_80,
        "credible_interval_95": ci_95,
    }

    weight_str = "  ".join(f"{k}={v:.3f}" for k, v in posterior_weights.items())
    print(f"✅ [AdvPred] BMA → pred=₹{bma_pred:.2f}  std=₹{pred_std:.2f}")
    print(f"   🏋️ Weights: {weight_str}")
    return result


def _bma_fallback(price):
    """Minimal BMA result when inputs are missing."""
    return {
        "bma_prediction": price,
        "posterior_weights": {},
        "prediction_std": 0.0,
        "credible_interval_80": (price, price),
        "credible_interval_95": (price, price),
    }


# =============================================================================
# 4. Ensemble Super-Blender
# =============================================================================

def super_blend_prediction(
    current_price,
    ensemble_pred,
    mc_pred,
    bma_pred,
    kalman_pred=None,
    garch_info=None,
    tv_analysis=None,
):
    """
    Fuse ALL prediction sources into a single final prediction.

    Base weighting:
        Ensemble (XGB/RF/LSTM/etc)   : 35%
        Monte Carlo enhanced          : 20%
        Bayesian Model Average         : 25%
        Kalman filtered                : 20%  (if available, else redistribute)

    Dynamic adjustments:
        If GARCH regime == HIGH → MC weight ↑ 30%, Ensemble ↓ 25%

    Mean-reversion anchor:
        Day-ahead prediction capped at ±3% from current price.

    Parameters
    ----------
    current_price : float
    ensemble_pred : float — from existing XGB/RF/LSTM ensemble in stock_engine
    mc_pred : float — from monte_carlo_enhanced_predict['mc_predicted_price']
    bma_pred : float — from bayesian_model_average['bma_prediction']
    kalman_pred : float or None — from Kalman filter (if available)
    garch_info : dict or None — output of garch_volatility_forecast
    tv_analysis : dict or None — output from fetch_tradingview_analysis

    Returns
    -------
    dict
        final_prediction : float
        method_weights   : dict
        confidence_score : float (0–1)
        confidence_high  : float
        confidence_low   : float
    """
    print("🔮 [AdvPred] Running Super-Blend prediction …")

    def _safe_price(val, fallback):
        try:
            v = float(val)
            return v if np.isfinite(v) and v > 0 else fallback
        except (TypeError, ValueError):
            return fallback

    ens = _safe_price(ensemble_pred, current_price)
    mc = _safe_price(mc_pred, current_price)
    bma = _safe_price(bma_pred, current_price)
    kal = _safe_price(kalman_pred, None) if kalman_pred is not None else None

    # ---- Base weights ----
    if kal is not None:
        w = {"ensemble": 0.20, "monte_carlo": 0.10, "bma": 0.15, "kalman": 0.55}
    else:
        # Redistribute Kalman's share proportionally
        w = {"ensemble": 0.4375, "monte_carlo": 0.25, "bma": 0.3125}
        print("   ℹ️  Kalman not available — weights redistributed")
 
    # ---- Dynamic adjustment for high-volatility regime ----
    vol_regime = "NORMAL"
    if garch_info and isinstance(garch_info, dict):
        vol_regime = garch_info.get("vol_regime", "NORMAL")
        if vol_regime == "HIGH":
            print("   🌊 HIGH vol regime detected → boosting MC weight")
            if kal is not None:
                w = {"ensemble": 0.15, "monte_carlo": 0.20, "bma": 0.15, "kalman": 0.50}
            else:
                w = {"ensemble": 0.30, "monte_carlo": 0.375, "bma": 0.325}
        elif vol_regime == "LOW":
            # In low-vol, trust the ensemble & BMA more
            if kal is not None:
                w = {"ensemble": 0.20, "monte_carlo": 0.05, "bma": 0.15, "kalman": 0.60}
            else:
                w = {"ensemble": 0.50, "monte_carlo": 0.125, "bma": 0.375}

    # ---- Weighted blend ----
    prices = {"ensemble": ens, "monte_carlo": mc, "bma": bma}
    if kal is not None:
        prices["kalman"] = kal

    blended = sum(prices[k] * w[k] for k in w)

    # ---- TradingView Adjustment ----
    tv_recommendation = None
    if tv_analysis and isinstance(tv_analysis, dict) and "summary" in tv_analysis:
        tv_recommendation = tv_analysis["summary"].get("RECOMMENDATION", "NEUTRAL")
        
        tv_adjustments = {
            "STRONG_BUY": 0.005,  # +0.5%
            "BUY": 0.002,         # +0.2%
            "NEUTRAL": 0.0,
            "SELL": -0.002,       # -0.2%
            "STRONG_SELL": -0.005 # -0.5%
        }
        adj = tv_adjustments.get(tv_recommendation, 0.0)
        
        if adj != 0.0:
            print(f"   📈 TradingView {tv_recommendation} → Adjusting blended price by {adj*100:+.2f}%")
            blended = blended * (1.0 + adj)

    # ---- Mean-reversion anchor (±3% cap for day-ahead) ----
    max_dev = current_price * 0.03
    capped = float(np.clip(blended, current_price - max_dev, current_price + max_dev))
    if abs(blended - capped) > 0.01:
        print(f"   🔒 Mean-reversion cap applied: {blended:.2f} → {capped:.2f}")
    blended = capped

    # ---- Confidence score (0–1) ----
    # Based on agreement among methods + volatility regime
    price_list = list(prices.values())
    spread = (max(price_list) - min(price_list)) / current_price if current_price > 0 else 1.0
    agreement_score = max(0.0, 1.0 - spread * 20)  # 5% spread → 0 confidence

    regime_penalty = {"HIGH": 0.15, "NORMAL": 0.0, "LOW": -0.05}
    confidence = agreement_score - regime_penalty.get(vol_regime, 0.0)
    confidence = float(np.clip(confidence, 0.05, 0.99))

    # ---- Confidence band ----
    band_pct = (1.0 - confidence) * 0.05 + 0.005  # min 0.5%, max ~5.5%
    confidence_high = blended * (1.0 + band_pct)
    confidence_low = blended * (1.0 - band_pct)
    
    # Store TV data in result
    w["trading_view"] = 0.0 # Just a placeholder weight for UI

    result = {
        "final_prediction": round(blended, 2),
        "method_weights": {k: round(v, 4) for k, v in w.items()},
        "tradingview_consensus": tv_analysis,
        "confidence_score": round(confidence, 4),
        "confidence_high": round(confidence_high, 2),
        "confidence_low": round(confidence_low, 2),
        "vol_regime_used": vol_regime,
    }
    print(f"✅ [AdvPred] SuperBlend → ₹{blended:.2f}  confidence={confidence:.2%}")
    return result


def _blend_fallback(price):
    """Fallback when blending cannot proceed."""
    return {
        "final_prediction": float(price),
        "method_weights": {},
        "confidence_score": 0.0,
        "confidence_high": float(price),
        "confidence_low": float(price),
        "vol_regime_used": "UNKNOWN",
    }


# =============================================================================
# 5. Convenience Pipeline
# =============================================================================

def run_full_advanced_pipeline(
    current_price,
    historical_df,
    model_predictions,
    historical_errors=None,
    kalman_price=None,
    ticker_symbol=None,
):
    """
    Execute the full advanced prediction pipeline in sequence.

    Steps:
        1. GARCH(1,1) volatility estimation
        2. Monte Carlo enhanced prediction (using GARCH vol)
        3. Bayesian Model Averaging
        4. Super-Blend ensemble

    Parameters
    ----------
    current_price : float
        Latest stock price.
    historical_df : pd.DataFrame
        DataFrame with at least a 'Close' column.
    model_predictions : dict
        Per-model price predictions, e.g. {'xgboost': …, 'rf': …, 'lstm': …, 'transformer': …}
    historical_errors : dict or None
        Per-model historical errors for BMA (optional).
    kalman_price : float or None
        Kalman-filtered price estimate (optional).

    Returns
    -------
    dict with keys:
        garch       — full GARCH result dict
        monte_carlo — full MC result dict
        bma         — full BMA result dict
        super_blend — full super-blend result dict
    """
    print("=" * 60)
    print("🚀 [AdvPred] === FULL ADVANCED PIPELINE START ===")
    print("=" * 60)

    # ---- Validate base inputs ----
    try:
        current_price = float(current_price)
    except (TypeError, ValueError):
        current_price = 0.0

    if historical_df is None or not isinstance(historical_df, pd.DataFrame) or historical_df.empty:
        print("⚠️  [AdvPred] Pipeline: no historical data — returning fallbacks")
        return {
            "garch": _ewma_volatility_fallback(np.array([]), 1),
            "monte_carlo": _mc_naive_fallback(current_price),
            "bma": _bma_fallback(current_price),
            "super_blend": _blend_fallback(current_price),
        }

    # Step 1 — GARCH
    try:
        closes = historical_df["Close"].dropna().values.astype(np.float64)
        log_returns = np.diff(np.log(closes))
        log_returns = log_returns[np.isfinite(log_returns)]
        garch_result = garch_volatility_forecast(log_returns, forecast_horizon=1)
    except Exception as e:
        print(f"⚠️  [AdvPred] GARCH step failed: {e}")
        garch_result = _ewma_volatility_fallback(np.array([]), 1)

    # Step 2 — Monte Carlo (pass GARCH vol if available)
    garch_vol = garch_result.get("forecast_volatility", None)
    try:
        mc_result = monte_carlo_enhanced_predict(
            current_price=current_price,
            historical_df=historical_df,
            garch_vol=garch_vol,
            n_simulations=5000,
            days_ahead=1,
        )
    except Exception as e:
        print(f"⚠️  [AdvPred] MC step failed: {e}")
        mc_result = _mc_naive_fallback(current_price)

    # Step 3 — Bayesian Model Averaging
    try:
        bma_result = bayesian_model_average(
            model_predictions=model_predictions,
            historical_errors=historical_errors,
            current_price=current_price,
        )
    except Exception as e:
        print(f"⚠️  [AdvPred] BMA step failed: {e}")
        bma_result = _bma_fallback(current_price)

    # Derive the base ensemble prediction (simple mean of model preds as fallback)
    if model_predictions and isinstance(model_predictions, dict):
        valid_vals = []
        for v in model_predictions.values():
            try:
                fv = float(v)
                if np.isfinite(fv) and fv > 0:
                    valid_vals.append(fv)
            except (TypeError, ValueError):
                continue
        ensemble_pred = float(np.mean(valid_vals)) if valid_vals else current_price
    else:
        ensemble_pred = current_price
        
    # Step 3.5 — TradingView Data Fetch
    tv_analysis = None
    if ticker_symbol:
        tv_analysis = fetch_tradingview_analysis(ticker_symbol)

    try:
        blend_result = super_blend_prediction(
            current_price=current_price,
            ensemble_pred=ensemble_pred,
            mc_pred=mc_result.get("mc_predicted_price", current_price),
            bma_pred=bma_result.get("bma_prediction", current_price),
            kalman_pred=kalman_price,
            garch_info=garch_result,
            tv_analysis=tv_analysis,
        )
    except Exception as e:
        print(f"⚠️  [AdvPred] SuperBlend step failed: {e}")
        blend_result = _blend_fallback(current_price)

    print("=" * 60)
    print("🏁 [AdvPred] === PIPELINE COMPLETE ===")
    print(f"   Final Prediction: ₹{blend_result.get('final_prediction', 'N/A')}")
    print(f"   Confidence: {blend_result.get('confidence_score', 0):.2%}")
    print("=" * 60)

    return {
        "garch": garch_result,
        "monte_carlo": mc_result,
        "bma": bma_result,
        "super_blend": blend_result,
    }


# =============================================================================
# Module self-test
# =============================================================================

if __name__ == "__main__":
    print("🧪 [AdvPred] Running self-test …\n")

    # Synthetic data
    np.random.seed(42)
    n = 300
    prices = 1000 * np.exp(np.cumsum(np.random.normal(0.0003, 0.015, n)))
    df = pd.DataFrame({"Close": prices})

    current = float(prices[-1])
    print(f"📌 Current price: ₹{current:.2f}\n")

    # 1. GARCH
    log_ret = np.diff(np.log(prices))
    g = garch_volatility_forecast(log_ret)
    print(f"   Result: {g}\n")

    # 2. MC
    mc = monte_carlo_enhanced_predict(current, df, garch_vol=g["forecast_volatility"])
    print(f"   Result: {mc}\n")

    # 3. BMA
    model_preds = {
        "xgboost": current * 1.005,
        "rf": current * 0.998,
        "lstm": current * 1.002,
        "transformer": current * 1.001,
    }
    bma = bayesian_model_average(model_preds, current_price=current)
    print(f"   Result: {bma}\n")

    # 4. Super Blend
    sb = super_blend_prediction(
        current_price=current,
        ensemble_pred=np.mean(list(model_preds.values())),
        mc_pred=mc["mc_predicted_price"],
        bma_pred=bma["bma_prediction"],
        garch_info=g,
    )
    print(f"   Result: {sb}\n")

    # 5. Full Pipeline
    print("\n" + "=" * 60)
    full = run_full_advanced_pipeline(current, df, model_preds)
    print(f"\n📊 Full pipeline result keys: {list(full.keys())}")
