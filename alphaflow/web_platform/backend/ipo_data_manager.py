"""
IPO Data Manager - Live IPO Data Import System
Handles automated daily import of IPO data from multiple sources
"""

import requests
import json
import time
import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class IPODataManager:
    def __init__(self, db_path: str = "ipo_data.db"):
        self.db_path = db_path
        self.init_database()
        
        # API Configuration
        self.finnhub_api_key = "demo"  # Demo key for testing
        self.fmp_api_key = "demo"  # Demo key for testing
        
        # Data sources configuration
        self.data_sources = [
            {
                'name': 'Finnhub',
                'url': 'https://finnhub.io/api/v1/ipo-calendar',
                'params': {'from': self._get_date_string(-30), 'to': self._get_date_string(90), 'token': self.finnhub_api_key},
                'parser': self._parse_finnhub_data
            },
            {
                'name': 'Financial Modeling Prep',
                'url': f'https://financialmodelingprep.com/api/v3/ipo_calendar',
                'params': {'apikey': self.fmp_api_key},
                'parser': self._parse_fmp_data
            },
            {
                'name': 'Mock Data',
                'url': None,  # No URL for mock data
                'params': {},
                'parser': self._parse_mock_data
            }
        ]
    
    def _get_date_string(self, days_offset: int) -> str:
        """Get date string in YYYY-MM-DD format with offset"""
        return (datetime.now() + timedelta(days=days_offset)).strftime('%Y-%m-%d')
    
    def init_database(self):
        """Initialize SQLite database for IPO data storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ipo_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name TEXT NOT NULL,
                sector TEXT,
                price_band TEXT,
                lot_size INTEGER,
                open_date TEXT,
                close_date TEXT,
                status TEXT,
                gmp REAL,
                gmp_pct REAL,
                subscription TEXT,
                ai_verdict TEXT,
                exchange TEXT,
                expected_price REAL,
                shares_offered INTEGER,
                ipo_type TEXT,
                listing_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_name, open_date)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_refresh_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                status TEXT NOT NULL,
                records_processed INTEGER DEFAULT 0,
                error_message TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add daily prediction storage table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker TEXT NOT NULL,
                prediction_date TEXT NOT NULL,
                open_prediction REAL,
                close_prediction REAL,
                lstm_prediction REAL,
                xgboost_prediction REAL,
                rf_prediction REAL,
                dt_prediction REAL,
                actual_open REAL,
                actual_close REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(ticker, prediction_date)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")
    
    def fetch_from_source(self, source: Dict) -> Optional[List[Dict]]:
        """Fetch IPO data from a specific source"""
        try:
            logger.info(f"Fetching data from {source['name']}...")
            
            # For mock data, don't make HTTP request
            if source['name'] == 'Mock Data':
                data = None  # No data needed for mock
            else:
                response = requests.get(source['url'], params=source['params'], timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                else:
                    logger.error(f"Failed to fetch from {source['name']}: HTTP {response.status_code}")
                    return None
            
            parsed_data = source['parser'](data)
            logger.info(f"Successfully fetched {len(parsed_data)} records from {source['name']}")
            return parsed_data
                
        except Exception as e:
            logger.error(f"Error fetching from {source['name']}: {str(e)}")
            return None
    
    def _parse_finnhub_data(self, data: List[Dict]) -> List[Dict]:
        """Parse Finnhub IPO calendar data"""
        ipo_list = []
        
        for item in data:
            try:
                # Convert Finnhub format to our standard format
                ipo_item = {
                    'company_name': item.get('name', 'N/A'),
                    'sector': self._categorize_sector(item.get('name', '')),
                    'price_band': f"₹{item.get('price', 0):.2f}" if item.get('price') else "N/A",
                    'lot_size': 0,  # Not available in Finnhub
                    'open_date': self._format_date(item.get('ipoDate')),
                    'close_date': self._format_date(item.get('ipoDate')),
                    'status': self._determine_status(item.get('ipoDate')),
                    'gmp': 0,  # Not available in Finnhub
                    'gmp_pct': 0,
                    'subscription': "N/A",
                    'ai_verdict': "N/A",
                    'exchange': item.get('exchange', 'NASDAQ'),
                    'expected_price': item.get('price', 0),
                    'shares_offered': item.get('numberOfShares', 0),
                    'ipo_type': 'Mainboard'
                }
                ipo_list.append(ipo_item)
            except Exception as e:
                logger.warning(f"Error parsing Finnhub item: {str(e)}")
                continue
        
        return ipo_list
    
    def _parse_fmp_data(self, data: List[Dict]) -> List[Dict]:
        """Parse Financial Modeling Prep IPO calendar data"""
        ipo_list = []
        
        for item in data:
            try:
                # Convert FMP format to our standard format
                open_date_obj = datetime.strptime(item.get('date'), "%Y-%m-%d")
                open_date_str = open_date_obj.strftime("%d %b")
                
                ipo_item = {
                    'company_name': item.get('company', 'N/A'),
                    'sector': item.get('exchange', 'General'),
                    'price_band': f"${item.get('price', 0):.2f}" if item.get('price') else "N/A",
                    'lot_size': 0,
                    'open_date': open_date_str,
                    'close_date': open_date_str,
                    'status': self._determine_status_from_date(open_date_obj),
                    'gmp': 0,
                    'gmp_pct': 0,
                    'subscription': "N/A",
                    'ai_verdict': "N/A",
                    'exchange': item.get('exchange', 'NASDAQ'),
                    'expected_price': item.get('price', 0),
                    'shares_offered': item.get('numberOfShares', 0),
                    'ipo_type': 'Mainboard'
                }
                ipo_list.append(ipo_item)
            except Exception as e:
                logger.warning(f"Error parsing FMP item: {str(e)}")
                continue
        
        return ipo_list
    
    def _parse_mock_data(self, data) -> List[Dict]:
        """Parse mock IPO data for testing"""
        import random
        
        mock_ipos = [
            {
                'company_name': 'TechCorp Solutions',
                'sector': 'Technology',
                'price_band': '$125.00 - $135.00',
                'lot_size': 100,
                'open_date': '15 Dec',
                'close_date': '18 Dec',
                'status': 'Upcoming',
                'gmp': 25.50,
                'gmp_pct': 18.9,
                'subscription': '2.5x',
                'ai_verdict': 'Apply',
                'exchange': 'NASDAQ',
                'expected_price': 130.00,
                'shares_offered': 5000000,
                'ipo_type': 'Mainboard'
            },
            {
                'company_name': 'GreenEnergy Innovations',
                'sector': 'Energy',
                'price_band': '$85.00 - $90.00',
                'lot_size': 150,
                'open_date': '18 Dec',
                'close_date': '20 Dec',
                'status': 'Upcoming',
                'gmp': 12.75,
                'gmp_pct': 14.2,
                'subscription': '1.8x',
                'ai_verdict': 'Watch',
                'exchange': 'NYSE',
                'expected_price': 87.50,
                'shares_offered': 3000000,
                'ipo_type': 'Mainboard'
            },
            {
                'company_name': 'BioPharm Labs',
                'sector': 'Healthcare',
                'price_band': '$45.00 - $50.00',
                'lot_size': 200,
                'open_date': '20 Dec',
                'close_date': '22 Dec',
                'status': 'Live',
                'gmp': 8.25,
                'gmp_pct': 16.5,
                'subscription': '3.2x',
                'ai_verdict': 'Strong Buy',
                'exchange': 'NASDAQ',
                'expected_price': 47.50,
                'shares_offered': 2500000,
                'ipo_type': 'Mainboard'
            },
            {
                'company_name': 'FinanceHub Digital',
                'sector': 'Finance',
                'price_band': '$200.00 - $210.00',
                'lot_size': 75,
                'open_date': '10 Dec',
                'close_date': '12 Dec',
                'status': 'Listed',
                'gmp': -5.00,
                'gmp_pct': -2.4,
                'subscription': '0.8x',
                'ai_verdict': 'Avoid',
                'exchange': 'NYSE',
                'expected_price': 205.00,
                'shares_offered': 1500000,
                'ipo_type': 'Mainboard'
            }
        ]
        
        # Add some randomness to simulate real-time updates
        for ipo in mock_ipos:
            ipo['gmp'] = round(ipo['gmp'] * random.uniform(0.8, 1.2), 2)
            ipo['gmp_pct'] = round(ipo['gmp_pct'] * random.uniform(0.9, 1.1), 1)
            ipo['subscription'] = f"{round(float(ipo['subscription'].replace('x', '')) * random.uniform(0.7, 1.3), 1)}x"
        
        return mock_ipos
    
    def _categorize_sector(self, company_name: str) -> str:
        """Categorize company sector based on name"""
        name = company_name.lower()
        
        if any(word in name for word in ['bank', 'finance', 'financial', 'insurance']):
            return "Finance"
        elif any(word in name for word in ['tech', 'software', 'digital', 'ai', 'cloud']):
            return "Technology"
        elif any(word in name for word in ['pharma', 'health', 'medical', 'bio']):
            return "Healthcare"
        elif any(word in name for word in ['energy', 'oil', 'power', 'solar']):
            return "Energy"
        elif any(word in name for word in ['auto', 'car', 'vehicle', 'motor']):
            return "Automobile"
        else:
            return "General"
    
    def _format_date(self, date_str: str) -> str:
        """Format date string to display format"""
        if not date_str:
            return "N/A"
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.strftime("%d %b")
        except:
            return date_str
    
    def _determine_status(self, ipo_date: str) -> str:
        """Determine IPO status based on date"""
        if not ipo_date:
            return "Upcoming"
        
        try:
            ipo_date_obj = datetime.strptime(ipo_date, "%Y-%m-%d")
            today = datetime.now().date()
            
            if ipo_date_obj.date() < today:
                return "Listed"
            elif ipo_date_obj.date() == today:
                return "Live"
            else:
                return "Upcoming"
        except:
            return "Upcoming"
    
    def _determine_status_from_date(self, date_obj: datetime) -> str:
        """Determine IPO status from datetime object"""
        today = datetime.now().date()
        
        if date_obj.date() < today:
            return "Listed"
        elif date_obj.date() == today:
            return "Live"
        else:
            return "Upcoming"
    
    def save_to_database(self, ipo_list: List[Dict], source: str):
        """Save IPO data to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        records_processed = 0
        errors = 0
        
        for ipo in ipo_list:
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO ipo_data 
                    (company_name, sector, price_band, lot_size, open_date, close_date, 
                     status, gmp, gmp_pct, subscription, ai_verdict, exchange, 
                     expected_price, shares_offered, ipo_type, listing_date, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    ipo['company_name'], ipo['sector'], ipo['price_band'], ipo['lot_size'],
                    ipo['open_date'], ipo['close_date'], ipo['status'], ipo['gmp'],
                    ipo['gmp_pct'], ipo['subscription'], ipo['ai_verdict'], ipo['exchange'],
                    ipo['expected_price'], ipo['shares_offered'], ipo['ipo_type'], ipo['open_date']
                ))
                records_processed += 1
            except Exception as e:
                logger.error(f"Error saving IPO record: {str(e)}")
                errors += 1
        
        # Log the refresh
        cursor.execute('''
            INSERT INTO data_refresh_log (source, status, records_processed, error_message)
            VALUES (?, ?, ?, ?)
        ''', (source, 'Success' if errors == 0 else 'Partial', records_processed, f"{errors} errors" if errors > 0 else None))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Saved {records_processed} IPO records from {source} ({errors} errors)")
        return records_processed, errors
    
    def refresh_all_sources(self):
        """Refresh data from all configured sources"""
        logger.info("Starting IPO data refresh from all sources...")
        
        total_records = 0
        successful_sources = 0
        
        for source in self.data_sources:
            try:
                data = self.fetch_from_source(source)
                if data:
                    records, errors = self.save_to_database(data, source['name'])
                    total_records += records
                    if errors == 0:
                        successful_sources += 1
                else:
                    # Log failed fetch
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO data_refresh_log (source, status, records_processed, error_message)
                        VALUES (?, ?, ?, ?)
                    ''', (source['name'], 'Failed', 0, 'Failed to fetch data'))
                    conn.commit()
                    conn.close()
                    
            except Exception as e:
                logger.error(f"Failed to process source {source['name']}: {str(e)}")
        
        logger.info(f"Refresh completed. Total records: {total_records}, Successful sources: {successful_sources}/{len(self.data_sources)}")
        return total_records, successful_sources
    
    def get_latest_ipos(self, limit: int = 20) -> List[Dict]:
        """Get latest IPO data from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT company_name, sector, price_band, lot_size, open_date, close_date,
                   status, gmp, gmp_pct, subscription, ai_verdict, exchange,
                   expected_price, shares_offered, ipo_type, listing_date
            FROM ipo_data 
            ORDER BY 
                CASE status 
                    WHEN 'Live' THEN 1
                    WHEN 'Upcoming' THEN 2
                    WHEN 'Listed' THEN 3
                    ELSE 4
                END,
                open_date DESC
            LIMIT ?
        ''', (limit,))
        
        columns = [description[0] for description in cursor.description]
        results = []
        
        for row in cursor.fetchall():
            ipo_dict = dict(zip(columns, row))
            # Convert to expected format for frontend
            results.append({
                'company': ipo_dict['company_name'],
                'sector': ipo_dict['sector'],
                'price_band': ipo_dict['price_band'],
                'lot_size': ipo_dict['lot_size'],
                'open_date': ipo_dict['open_date'],
                'close_date': ipo_dict['close_date'],
                'status': ipo_dict['status'],
                'gmp': ipo_dict['gmp'],
                'gmp_pct': f"{ipo_dict['gmp_pct']:.1f}" if ipo_dict['gmp_pct'] else "0",
                'subscription': ipo_dict['subscription'],
                'ai_verdict': ipo_dict['ai_verdict']
            })
        
        conn.close()
        return results
    
    def get_refresh_status(self) -> Dict:
        """Get status of last data refresh"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT source, status, records_processed, error_message, timestamp
            FROM data_refresh_log
            ORDER BY timestamp DESC
            LIMIT 10
        ''')
        
        columns = [description[0] for description in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return {'recent_refreshes': results}
    
    def save_daily_prediction(self, ticker: str, prediction_data: Dict):
        """Save daily prediction for a ticker"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        prediction_date = datetime.now().strftime('%Y-%m-%d')
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO daily_predictions 
                (ticker, prediction_date, open_prediction, close_prediction, 
                 lstm_prediction, xgboost_prediction, rf_prediction, dt_prediction,
                 updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                ticker, prediction_date,
                prediction_data.get('open'),
                prediction_data.get('close'),
                prediction_data.get('lstm'),
                prediction_data.get('xgboost'),
                prediction_data.get('rf'),
                prediction_data.get('dt')
            ))
            
            conn.commit()
            logger.info(f"Saved daily prediction for {ticker} on {prediction_date}")
            
        except Exception as e:
            logger.error(f"Error saving daily prediction for {ticker}: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def get_daily_prediction(self, ticker: str, date_str: str = None) -> Optional[Dict]:
        """Get daily prediction for a ticker on specific date"""
        if date_str is None:
            date_str = datetime.now().strftime('%Y-%m-%d')
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ticker, prediction_date, open_prediction, close_prediction,
                   lstm_prediction, xgboost_prediction, rf_prediction, dt_prediction,
                   actual_open, actual_close
            FROM daily_predictions
            WHERE ticker = ? AND prediction_date = ?
        ''', (ticker, date_str))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'ticker': row[0],
                'prediction_date': row[1],
                'open_prediction': row[2],
                'close_prediction': row[3],
                'lstm_prediction': row[4],
                'xgboost_prediction': row[5],
                'rf_prediction': row[6],
                'dt_prediction': row[7],
                'actual_open': row[8],
                'actual_close': row[9]
            }
        return None
    
    def update_actual_prices(self, ticker: str, actual_open: float, actual_close: float):
        """Update actual prices for today's prediction"""
        prediction_date = datetime.now().strftime('%Y-%m-%d')
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE daily_predictions
                SET actual_open = ?, actual_close = ?, updated_at = CURRENT_TIMESTAMP
                WHERE ticker = ? AND prediction_date = ?
            ''', (actual_open, actual_close, ticker, prediction_date))
            
            conn.commit()
            logger.info(f"Updated actual prices for {ticker} on {prediction_date}")
            
        except Exception as e:
            logger.error(f"Error updating actual prices for {ticker}: {str(e)}")
            conn.rollback()
        finally:
            conn.close()
    
    def get_prediction_accuracy(self, ticker: str, days: int = 30) -> List[Dict]:
        """Get prediction accuracy history for a ticker"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT prediction_date, open_prediction, close_prediction,
                   actual_open, actual_close
            FROM daily_predictions
            WHERE ticker = ? AND actual_open IS NOT NULL AND actual_close IS NOT NULL
            ORDER BY prediction_date DESC
            LIMIT ?
        ''', (ticker, days))
        
        results = []
        for row in cursor.fetchall():
            if row[1] is not None and row[2] is not None and row[3] is not None and row[4] is not None:
                open_accuracy = 100 - (abs(row[1] - row[3]) / row[3] * 100) if row[3] != 0 else 0
                close_accuracy = 100 - (abs(row[2] - row[4]) / row[4] * 100) if row[4] != 0 else 0
                
                results.append({
                    'date': row[0],
                    'open_prediction': row[1],
                    'close_prediction': row[2],
                    'actual_open': row[3],
                    'actual_close': row[4],
                    'open_accuracy': round(open_accuracy, 1),
                    'close_accuracy': round(close_accuracy, 1),
                    'avg_accuracy': round((open_accuracy + close_accuracy) / 2, 1)
                })
        
        conn.close()
        return results

# Global instance
ipo_manager = IPODataManager()

def refresh_ipo_data():
    """Function to be called for scheduled refresh"""
    return ipo_manager.refresh_all_sources()

def get_live_ipo_data():
    """Get latest IPO data for API consumption"""
    return ipo_manager.get_latest_ipos()

if __name__ == "__main__":
    # Test the system
    print("Testing IPO Data Manager...")
    
    # Refresh data
    total_records, successful_sources = refresh_ipo_data()
    print(f"Refreshed {total_records} records from {successful_sources} sources")
    
    # Get latest data
    latest_ipos = get_live_ipo_data()
    print(f"Retrieved {len(latest_ipos)} IPOs from database")
    
    # Print sample
    if latest_ipos:
        print("\nSample IPO:")
        print(json.dumps(latest_ipos[0], indent=2))
