import sqlite3

conn = sqlite3.connect("backend/resume_analyzer.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    for table in tables:
        tname = table[0]
        cursor.execute(f"SELECT COUNT(*) FROM {tname};")
        count = cursor.fetchone()[0]
        print(f"Table '{tname}' has {count} rows.")
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
