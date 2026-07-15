import pandas as pd
df = pd.DataFrame({'Open': [1,2,3]}, index=pd.Index(['2020','2021','2022'], name='Date'))
for _, row in df.iterrows():
    try:
        print(row['Date'])
    except Exception as e:
        print("Error:", type(e), e)
