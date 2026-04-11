# app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import QueuePool
import time
import logging

from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create engine with aggressive pool settings
engine = create_engine(
    settings.database_url,
    pool_size=50,           # Increased from 20
    max_overflow=100,       # Increased from 40
    pool_timeout=60,        # Increased timeout
    pool_recycle=300,       # Recycle connections every 5 minutes
    pool_pre_ping=True,     # Check connection before using
    echo=False,
)

# Log pool settings on startup
logger.info(f"Database pool configured: size={engine.pool.size()}, overflow={engine.pool._max_overflow}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    Database dependency that ensures connections are always closed.
    """
    db = None
    try:
        db = SessionLocal()
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        if db:
            db.rollback()
        raise
    finally:
        if db:
            db.close()
            logger.debug("Database session closed")