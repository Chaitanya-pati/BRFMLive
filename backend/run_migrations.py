"""
Automatic database migration runner.
This module runs Alembic migrations automatically on app startup.
"""
import subprocess
import os
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def apply_migrations():
    """
    Apply all pending Alembic migrations to bring database to latest version.
    This runs automatically when the application starts.
    Uses subprocess to avoid circular import issues.
    """
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        logger.info("Starting automatic database migrations...")
        
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"Migration failed: {result.stderr}")
            raise RuntimeError(f"Database migration failed: {result.stderr}")
        
        logger.info("Database migrations completed successfully!")
        logger.debug(result.stdout)
        
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        raise
