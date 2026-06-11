import sys
import os
import sqlite3

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))

from database import engine, Base
from models import JobPosting

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend", "resume_analyzer.db"))
print(f"Connecting to SQLite database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Dropping table 'job_postings'...")
    cursor.execute("DROP TABLE IF EXISTS job_postings;")
    conn.commit()
    print("Table dropped successfully.")
except Exception as e:
    print("Error dropping table:", e)
finally:
    conn.close()

print("Recreating all tables via SQLAlchemy...")
Base.metadata.create_all(bind=engine)
print("Recreation complete! Let's verify table info...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("PRAGMA table_info(job_postings);")
    cols = cursor.fetchall()
    print("New job_postings Table Schema:")
    for col in cols:
        print(col)
except Exception as e:
    print("Error getting schema:", e)
finally:
    conn.close()
