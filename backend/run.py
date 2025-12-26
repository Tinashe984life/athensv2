from app import create_app
from flask import send_from_directory
import os

# CORRECT PATH CALCULATION
# run.py is in backend/, so:
BASE_DIR = os.path.abspath(os.path.dirname(__file__))  # /athensv2/backend
PROJECT_ROOT = os.path.dirname(BASE_DIR)  # /athensv2
FRONTEND_DIST_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")

print("🚀 Athens Sports Server Starting...")
print(f"📁 Project root: {PROJECT_ROOT}")
print(f"📁 Frontend dist: {FRONTEND_DIST_DIR}")

app = create_app()

# Serve React app
@app.route("/")
def serve_react_root():
    return send_from_directory(FRONTEND_DIST_DIR, "index.html")

@app.route("/<path:path>")
def serve_react_all(path):
    # Don't interfere with API routes
    if path.startswith("api/"):
        return app.view_functions[rule.endpoint](**request.view_args) if rule else "API not found"
    
    # Try to serve static file
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST_DIR, path)):
        return send_from_directory(FRONTEND_DIST_DIR, path)
    
    # Otherwise serve index.html for React routing
    return send_from_directory(FRONTEND_DIST_DIR, "index.html")

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(FRONTEND_DIST_DIR, "index.html")

if __name__ == '__main__':
    # Verify frontend is built
    if not os.path.exists(FRONTEND_DIST_DIR):
        print("❌ WARNING: frontend/dist not found!")
        print("   Run: cd frontend && npm run build")
    
    app.run(debug=True, host='0.0.0.0', port=5000)