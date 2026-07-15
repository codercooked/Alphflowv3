import sys, time
sys.path.append('/Users/sarthak/alphaflow-stock/alphaflow/web_platform/backend')
import stock_engine

start = time.time()
print("Starting...")
res = stock_engine.analyze_ticker('TCS.NS')
print("Finished in", time.time() - start)
