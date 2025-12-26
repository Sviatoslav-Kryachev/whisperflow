"""
Database migration script - adds folders table, folder_id and status_message fields
"""
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite3")

def migrate():
    print(f"Migrating database: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("Database not found. It will be created when server starts.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 1. Create folders table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL,
                user_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] folders table created/checked")
        
        # 2. Check columns in transcripts
        cursor.execute("PRAGMA table_info(transcripts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add folder_id if missing
        if 'folder_id' not in columns:
            cursor.execute("ALTER TABLE transcripts ADD COLUMN folder_id INTEGER REFERENCES folders(id)")
            print("[OK] folder_id column added to transcripts")
        else:
            print("[OK] folder_id column already exists")
        
        # Add status_message if missing
        if 'status_message' not in columns:
            cursor.execute("ALTER TABLE transcripts ADD COLUMN status_message VARCHAR")
            print("[OK] status_message column added to transcripts")
        else:
            print("[OK] status_message column already exists")
        
        conn.commit()
        print("\n[SUCCESS] Migration completed!")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
