from tradingview_ta import TA_Handler, Interval

def fetch_tradingview_analysis(ticker):
    try:
        # Map Yahoo Finance ticker format (e.g. RELIANCE.NS) to TradingView
        symbol = ticker
        exchange = "NSE"
        screener = "india"
        
        if ".NS" in ticker:
            symbol = ticker.replace(".NS", "")
        elif ".BO" in ticker:
            symbol = ticker.replace(".BO", "")
            exchange = "BSE"
        elif "^" in ticker:
            # Indices usually don't work trivially without knowing exact TV symbol
            if ticker == "^NSEI":
                symbol = "NIFTY"
            elif ticker == "^BSESN":
                symbol = "SENSEX"
                exchange = "BSE"
            else:
                return None
        elif ticker.isalpha() and len(ticker) <= 5:
            # Assume US equity
            screener = "america"
            exchange = "NASDAQ" # Fallback, tradingview_ta handles some auto-routing
            
        handler = TA_Handler(
            symbol=symbol,
            screener=screener,
            exchange=exchange,
            interval=Interval.INTERVAL_1_DAY
        )
        analysis = handler.get_analysis()
        return {
            "summary": analysis.summary,
            "oscillators": analysis.oscillators,
            "moving_averages": analysis.moving_averages
        }
    except Exception as e:
        print(f"⚠️  [TradingView] Failed to fetch {ticker}: {e}")
        return None
