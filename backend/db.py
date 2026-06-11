import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables relative to this file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

# Normalize postgres scheme if needed
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Check and try database initialization
engine = None
SessionLocal = None

if DATABASE_URL and (DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgresql+psycopg2://")):
    try:
        print(f"[DB] Attempting connection to PostgreSQL...")
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        # Verify connection
        with engine.connect() as conn:
            pass
        print("[DB] PostgreSQL connection successful ✅")
    except Exception as e:
        print(f"[DB WARN] PostgreSQL connection failed: {e}. Falling back to SQLite.")
        engine = None

if not engine:
    print("[DB] Initializing SQLite fallback database...")
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "resume_analyzer.db"))
    SQLITE_URL = f"sqlite:///{db_path}"
    print(f"[DB] Using SQLite database path: {db_path}")
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
