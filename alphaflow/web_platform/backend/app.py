from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import stock_engine
from options_engine import OptionsEngine
from options_strategy import OptionsStrategy
import random
import time
import numpy as np
import requests

# Optional: Import razorpay if available
try:
    import razorpay
    RAZORPAY_AVAILABLE = True
except ImportError:
    RAZORPAY_AVAILABLE = False
    razorpay = None

# Flask app initialization — serve frontend static build in production
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist'))
print(f"[AlphaFlow] Looking for frontend dist at: {FRONTEND_DIST}")
print(f"[AlphaFlow] Dist exists: {os.path.isdir(FRONTEND_DIST)}")
if os.path.isdir(FRONTEND_DIST):
    print(f"[AlphaFlow] Dist contents: {os.listdir(FRONTEND_DIST)}")
app = Flask(__name__)
CORS(app)

# Initialize Options Engines
options_engine = OptionsEngine()
options_strategy = OptionsStrategy()

# --- RAZORPAY CONFIGURATION ---
RAZORPAY_KEY_ID = "rzp_live_Rqf5RRcKnSL1Ch"
RAZORPAY_KEY_SECRET = "ubJaGMFKBWtERZ5CeFbRK1yq"

# --- SUPABASE CONFIGURATION ---
SUPABASE_URL = "https://fpcddsepudlqcvjutypm.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwY2Rkc2VwdWRscWN2anV0eXBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2OTcyOSwiZXhwIjoyMDc5NjQ1NzI5fQ.X-7cIrXJ0YPLRYGVyLdzO7YJg0OAJbzfE5pKEvvIRIk"

# ==========================================
#              HEALTH CHECK
# ==========================================

@app.route('/health', methods=['GET'])
def health(): 
    return jsonify({"status": "alive", "server": "AlphaFlow API"})

@app.route('/api/mcp/ready', methods=['GET'])
def mcp_ready():
    return jsonify({"ready": True})

@app.route('/api/test_fundamentals/<ticker>', methods=['GET'])
def test_fundamentals(ticker):
    """Quick test endpoint to verify fundamentals data"""
    fallback = stock_engine.get_fallback_fundamentals(ticker)
    if fallback:
        return jsonify({"status": "ok", "source": "hardcoded", "fundamentals": fallback})
    return jsonify({"status": "not_found", "ticker": ticker, "available": list(stock_engine.STOCK_FUNDAMENTALS.keys())})

# --- RAZORPAY ROUTES ---

@app.route('/api/create-order', methods=['POST'])
def create_order():
    if not RAZORPAY_AVAILABLE:
        return jsonify({"error": "Razorpay not initialized"}), 500
    
    try:
        data = request.json
        amount = data.get('amount', 499) * 100 # Default 499 INR, convert to paise
        currency = "INR"
        
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        payment = client.order.create({
            'amount': amount, 
            'currency': currency, 
            'payment_capture': 1
        })
        
        return jsonify({
            "order_id": payment['id'],
            "currency": currency,
            "amount": amount,
            "key_id": RAZORPAY_KEY_ID
        })
    except Exception as e:
        print(f"Razorpay Order Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/verify-payment', methods=['POST'])
def verify_payment():
    if not RAZORPAY_AVAILABLE:
        return jsonify({"error": "Razorpay not initialized"}), 500
        
    try:
        data = request.json
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')
        user_id = data.get('user_id') # Get User ID from frontend
        
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        
        # Verify Signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        client.utility.verify_payment_signature(params_dict)

        # Check and Capture if needed
        try:
            payment_details = client.payment.fetch(razorpay_payment_id)
            if payment_details['status'] == 'authorized':
                client.payment.capture(razorpay_payment_id, payment_details['amount'])
                print(f"💰 Payment Auto-Captured: {razorpay_payment_id}")
        except Exception as capture_err:
             print(f"⚠️ Capture Checks Failed: {capture_err}")
        
        # --- SERVER-SIDE PERSISTENCE (SUPABASE) ---
        if user_id:
            try:
                from datetime import datetime, timedelta
                expiry_date = (datetime.now() + timedelta(days=30)).isoformat()
                
                url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
                headers = {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "user_metadata": {
                        "pro_expiry": expiry_date
                    }
                }
                
                print(f"🔄 Updating Supabase for User: {user_id}")
                supa_res = requests.put(url, json=payload, headers=headers)
                
                if supa_res.status_code == 200:
                    print(f"✅ Supabase Metadata Updated Successfully: {expiry_date}")
                else:
                    print(f"❌ Supabase Update Failed: {supa_res.status_code} - {supa_res.text}")
                    
            except Exception as se:
                print(f"❌ Supabase Sync Exception: {se}")

        # Payment Successful
        print(f"✅ Payment Verified: {razorpay_payment_id}")
        return jsonify({"status": "success"})
        
    except razorpay.errors.SignatureVerificationError:
        print("❌ Payment Signature Verification Failed")
        return jsonify({"error": "Signature Verification Failed"}), 400
    except Exception as e:
        print(f"Payment Verification Error: {e}")
        return jsonify({"error": str(e)}), 500



# ==========================================
#               API ROUTES
# ==========================================

@app.route('/api/analyze', methods=['POST'])
def analyze():
    ticker = "UNKNOWN"
    try:
        print("--- /api/analyze: Request received ---")
        data = request.json
        if not data:
            data = {}
        ticker = data.get('ticker', 'TCS')
        print(f"--- /api/analyze: Analyzing ticker: {ticker} ---")
        result = stock_engine.analyze_ticker(ticker)
        print(f"--- /api/analyze: Analysis for {ticker} completed. Result is None: {result is None} ---")
        if result:
            print(f"--- /api/analyze: Returning JSON for {ticker} ---")
            return jsonify(result)
        
        print(f"--- /api/analyze: Result was None or empty for {ticker}. Returning 404. ---")
        return jsonify({"error": "Ticker not found"}), 404
    except Exception as e:
        print(f"--- /api/analyze: FATAL EXCEPTION for {ticker}: {e} ---")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/market_status', methods=['GET'])
def market_status():
    try:
        result = stock_engine.analyze_ticker('^NSEI')
        if result:
            result['ticker'] = "NIFTY 50"
            return jsonify(result)
        return jsonify({"error": "Data unavailable"}), 500
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        user_msg = request.json.get('message', '')
        response = stock_engine.get_chat_response(user_msg)
        return jsonify({"response": response})
    except: return jsonify({"response": "Connection error."})

@app.route('/api/news_analysis', methods=['GET'])
def get_news():
    try: return jsonify(stock_engine.get_ai_news())
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/ticker_data', methods=['GET'])
def get_ticker_data():
    try: 
        data = stock_engine.get_nifty_ticker_data()
        if data is None:
            print("Warning: get_nifty_ticker_data returned None. Returning empty list.")
            return jsonify([])
        return jsonify(data)
    except Exception as e: 
        print(f"Error in get_ticker_data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch ticker data", "details": str(e)}), 500

@app.route('/api/top10_predictions', methods=['GET'])
def get_top10_predictions():
    """Get today's top 10 AI stock predictions"""
    try:
        import sqlite3
        from datetime import datetime
        
        db_path = os.path.join(os.path.dirname(__file__), 'top10_predictions.db')
        
        # Check if database exists
        if not os.path.exists(db_path):
            # Return mock data if database doesn't exist yet
            return jsonify({
                'picks': [],
                'last_updated': None,
                'message': 'Top 10 predictions not yet generated. Run daily_top10_updater.py'
            })
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get today's or latest predictions
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
            SELECT ticker, company_name, current_price, predicted_price,
                   predicted_change_pct, ai_score, prediction_date
            FROM top10_picks
            WHERE prediction_date = (SELECT MAX(prediction_date) FROM top10_picks)
            ORDER BY ai_score DESC
            LIMIT 10
        ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        picks = []
        for row in rows:
            picks.append({
                'symbol': row[0],
                'name': row[1],
                'price': f"{row[2]:,.2f}",
                'change': round(row[4], 2),
                'score': row[5],
                'predicted_price': round(row[3], 2)
            })
        
        return jsonify({
            'picks': picks,
            'last_updated': rows[0][6] if rows else None,
            'count': len(picks)
        })
        
    except Exception as e:
        print(f"Error fetching top 10 predictions: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'picks': [], 'error': str(e)})

@app.route('/api/ipo_data', methods=['GET'])
def get_ipo_data():
    try: return jsonify(stock_engine.get_ipo_data())
    except: return jsonify([])

@app.route('/api/refresh_ipo_data', methods=['POST'])
def refresh_ipo_data():
    """Manually trigger IPO data refresh"""
    try:
        import ipo_data_manager
        total_records, successful_sources = ipo_data_manager.refresh_ipo_data()
        return jsonify({
            "status": "success",
            "message": f"Refreshed {total_records} records from {successful_sources} sources",
            "records": total_records,
            "sources": successful_sources
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/ipo_status', methods=['GET'])
def get_ipo_status():
    """Get IPO data refresh status"""
    try:
        import ipo_data_manager
        status = ipo_data_manager.ipo_manager.get_refresh_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/watchtower-scan', methods=['POST'])
def watchtower_scan():
    """Scans provided tickers for Buy/Sell signals"""
    try:
        data = request.json
        tickers = data.get('tickers', [])
        signals = []
        
        # Limit processing to prevent timeouts (Concurrent futures could be used here)
        process_limit = 10
        
        print(f"Watchtower scanning: {len(tickers)} tickers...")
        
        for ticker in tickers[:process_limit]:
            try:
                # Use cached analysis if available to speed up
                analysis = stock_engine.analyze_ticker(ticker)
                sig = analysis.get('trade_signal')
                if sig:
                    signals.append(sig)
            except Exception as e:
                print(f"Error scanning {ticker}: {e}")
                
        return jsonify({"signals": signals})
    except Exception as e:
        print(f"Watchtower Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/options/<ticker>', methods=['GET'])
def get_options_data(ticker):
    """
    Fetches options chain and AI-recommended strategy for a ticker.
    """
    try:
        # Get expiry parameter (optional)
        expiry = request.args.get('expiry', None)
        
        # Fetch options chain
        chain_data = options_engine.get_options_chain(ticker, expiry)
        
        if not chain_data:
            return jsonify({"error": "Options data not available for this ticker"}), 404
        
        # Filter to ATM options for cleaner UI
        filtered_chain = options_engine.filter_atm_options(chain_data, num_strikes=7)
        
        # Get AI signal for this ticker
        try:
            analysis = stock_engine.analyze_ticker(ticker)
            signal = analysis.get('trade_signal')
        except:
            signal = None
        
        # Generate recommendation if signal exists
        recommendation = None
        if signal and signal.get('action') != 'HOLD':
            recommendation = options_strategy.recommend_option(signal, chain_data)
            if recommendation:
                risk_reward = options_strategy.calculate_risk_reward(recommendation, signal)
                recommendation['risk_reward'] = risk_reward
        
        # Convert DataFrames to dict for JSON
        response = {
            'spot': filtered_chain['spot'],
            'expiry': filtered_chain['expiry'],
            'calls': filtered_chain['calls'].to_dict('records') if not filtered_chain['calls'].empty else [],
            'puts': filtered_chain['puts'].to_dict('records') if not filtered_chain['puts'].empty else [],
            'recommendation': recommendation,
            'signal': signal
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Options API Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/track-record', methods=['GET'])
def get_track_record():
    """
    Returns historical prediction accuracy and track record.
    """
    try:
        import sqlite3
        import pandas as pd
        
        db_path = os.path.join(os.path.dirname(__file__), 'ipo_data.db')
        conn = sqlite3.connect(db_path)
        
        query = """
            SELECT 
                ticker,
                prediction_date,
                close_prediction,
                actual_close,
                lstm_prediction,
                xgboost_prediction,
                rf_prediction
            FROM daily_predictions
            WHERE actual_close IS NOT NULL
            ORDER BY prediction_date DESC
            LIMIT 100
        """
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        # Drop any rows with missing prediction data to prevent NaN
        df = df.dropna(subset=['close_prediction', 'actual_close'])

        if df.empty:
            return jsonify({
                "message": "No historical data available yet",
                "accuracy": 0,
                "predictions": []
            })

        # Calculate accuracy metrics
        df['error'] = abs(df['close_prediction'] - df['actual_close'])
        df['error_pct'] = (df['error'] / df['actual_close']) * 100
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0) # Safety first
        df['correct'] = df['error_pct'] < 5  # Within 5% is "correct"
        
        # Overall metrics
        accuracy = (df['correct'].sum() / len(df)) * 100 if len(df) > 0 else 0
        avg_error_pct = df['error_pct'].mean() if len(df) > 0 else 0
        
        # Daily breakdown
        predictions_list = []
        for _, row in df.iterrows():
            predictions_list.append({
                'ticker': row['ticker'],
                'date': row['prediction_date'],
                'predicted': round(row['close_prediction'], 2),
                'actual': round(row['actual_close'], 2),
                'error_pct': round(row['error_pct'], 2),
                'correct': bool(row['correct'])
            })
        
        # Win rate by ticker
        ticker_stats = df.groupby('ticker').agg({
            'correct': 'mean',
            'error_pct': 'mean'
        }).reset_index()
        
        ticker_performance = []
        for _, row in ticker_stats.iterrows():
            ticker_performance.append({
                'ticker': row['ticker'],
                'win_rate': round(row['correct'] * 100, 1),
                'avg_error': round(row['error_pct'], 2)
            })
        
        return jsonify({
            'overall_accuracy': round(accuracy, 1),
            'avg_error_pct': round(avg_error_pct, 2),
            'total_predictions': len(df),
            'correct_predictions': int(df['correct'].sum()),
            'predictions': predictions_list[:30],  # Last 30 for display
            'ticker_performance': sorted(ticker_performance, key=lambda x: x['win_rate'], reverse=True)[:10]
        })
        
    except Exception as e:
        print(f"Track Record Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/send_otp', methods=['POST'])
def send_otp():
    return jsonify({"status": "success", "message": "OTP Sent"})


# --- CATCH-ALL: Serve React SPA for any non-API route ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    # If it's an API route, return 404 (should be handled above)
    if path.startswith('api/'):
        return jsonify({"error": "Not found"}), 404

    # Serve from frontend dist
    if os.path.isdir(FRONTEND_DIST):
        # If path points to an actual file, serve it
        if path and os.path.isfile(os.path.join(FRONTEND_DIST, path)):
            return send_from_directory(FRONTEND_DIST, path)
        # Otherwise serve index.html (SPA routing)
        index_path = os.path.join(FRONTEND_DIST, 'index.html')
        if os.path.isfile(index_path):
            return send_from_directory(FRONTEND_DIST, 'index.html')

    return jsonify({"error": "Frontend not built", "dist_path": FRONTEND_DIST, "exists": os.path.isdir(FRONTEND_DIST)}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    print("\n" + "="*50)
    print("   🚀 AlphaFlow Server Started")
    print("="*50)
    print(f"\n📍 Backend API: http://localhost:{port}")
    print("📍 Frontend App: http://localhost:5173")
    print("\n✅ Make sure to run frontend with: cd frontend && npm run dev")
    print("\n" + "="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=port)
