"""Root entry point for local development."""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from api.index import app

if __name__ == "__main__":
    app.run(debug=True, port=5001)
