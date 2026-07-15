import sys
sys.path.append('/Users/sarthak/alphaflow-stock/alphaflow/web_platform/backend')
import stock_engine
res = stock_engine.analyze_ticker('TCS.NS')
print(res['history'][:2])
