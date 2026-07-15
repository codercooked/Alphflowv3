import sys, time
sys.path.append('/Users/sarthak/alphaflow-stock/alphaflow/web_platform/backend')
import stock_engine

start = time.time()
print("Starting analyze_ticker 1...")
res = stock_engine.analyze_ticker('TCS.NS')
print("Finished analyze_ticker 1 in", time.time() - start)

start = time.time()
print("Starting analyze_ticker 2...")
res2 = stock_engine.analyze_ticker('TCS.NS')
print("Finished analyze_ticker 2 in", time.time() - start)
