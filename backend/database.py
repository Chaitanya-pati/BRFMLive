import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use PostgreSQL only
DATABASE_URL = os.getenv('DATABASE_URL')
#DATABASE_URL = 'postgresql://neondb_owner:npg_Fj3BD2XscIqk@ep-still-math-afmw2sjv-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. Please configure PostgreSQL database in Replit."
    )

# Configure engine for PostgreSQL with connection pooling
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
