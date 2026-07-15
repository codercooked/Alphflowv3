"""
WSGI entry point for Render deployment.
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web_platform', 'backend')
frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web_platform', 'frontend', 'dist')

sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

print(f"[WSGI] Backend dir: {backend_dir}")
print(f"[WSGI] Frontend dist: {frontend_dist}")
print(f"[WSGI] Frontend dist exists: {os.path.isdir(frontend_dist)}")
if os.path.isdir(frontend_dist):
    print(f"[WSGI] Dist contents: {os.listdir(frontend_dist)}")

# Try importing the real app, fall back to a diagnostic app if it fails
try:
    from app import app
    print("[WSGI] Successfully imported app!")
except Exception as e:
    print(f"[WSGI] ERROR importing app: {e}")
    import traceback
    traceback.print_exc()

    # Create a minimal diagnostic Flask app
    from flask import Flask, jsonify
    app = Flask(__name__)

    import_error_msg = str(e)

    @app.route('/')
    def index():
        return jsonify({
            "error": "App failed to start",
            "detail": import_error_msg,
            "backend_dir": backend_dir,
            "backend_files": os.listdir(backend_dir)[:20],
            "python_version": sys.version,
            "cwd": os.getcwd(),
        })

    @app.route('/health')
    def health():
        return jsonify({"status": "error", "detail": import_error_msg})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    app.run(host='0.0.0.0', port=port)
