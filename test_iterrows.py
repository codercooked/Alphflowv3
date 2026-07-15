import sys
sys.path.append('/Users/sarthak/alphaflow-stock/alphaflow/web_platform/backend')
from stock_engine import get_data_and_info
df, _, _, _ = get_data_and_info('TCS.NS')
for idx, row in df.head(1).iterrows():
    print(idx)
    print(row.keys())
