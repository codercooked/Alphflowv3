import sys
sys.path.append('/Users/sarthak/alphaflow-stock/alphaflow/web_platform/backend')
import stock_engine
import cProfile

cProfile.run("stock_engine.analyze_ticker('TCS.NS')", sort='cumtime')
