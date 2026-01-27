import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Priority: Environment Variable > Hardcoded Fallback
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    # This was the previously hardcoded URL which might be out of sync
    DATABASE_URL = 'postgresql://neondb_owner:npg_Fj3BD2XscIqk@ep-summer-brook-af6opqny-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'

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
