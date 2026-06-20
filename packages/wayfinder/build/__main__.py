"""
Allow running build package as module: python -m build
"""
from .wayfinder import app

if __name__ == "__main__":
    app()
