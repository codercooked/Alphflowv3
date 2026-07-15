import pandas as pd
import numpy as np
import time

def hurst_exponent(series, max_lag=100):
    if len(series) < max_lag:
        return 0.5
    lags = range(2, max_lag)
    tau = [np.sqrt(np.std(np.subtract(series[lag:], series[:-lag]))) for lag in lags]
    poly = np.polyfit(np.log(lags), np.log(tau), 1)
    return poly[0] * 2.0

s = pd.Series(np.random.randn(1000))

t0 = time.time()
s.rolling(252).apply(lambda x: hurst_exponent(x), raw=False)
print("raw=False took", time.time()-t0)

t0 = time.time()
s.rolling(252).apply(lambda x: hurst_exponent(x), raw=True)
print("raw=True took", time.time()-t0)
