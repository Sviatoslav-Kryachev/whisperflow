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
        
        # Add language if missing
        if 'language' not in columns:
            cursor.execute("ALTER TABLE transcripts ADD COLUMN language VARCHAR")
            print("[OK] language column added to transcripts")
        else:
            print("[OK] language column already exists")
        
        # 3. Create transcript_ai table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transcript_ai (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transcript_id INTEGER NOT NULL REFERENCES transcripts(id),
                file_id VARCHAR NOT NULL,
                summary TEXT,
                summary_created_at DATETIME,
                keywords TEXT,
                keywords_created_at DATETIME,
                sentiment TEXT,
                sentiment_created_at DATETIME,
                category VARCHAR,
                category_confidence REAL,
                category_created_at DATETIME,
                translations TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] transcript_ai table created/checked")
        
        # 4. Create conversations table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                language VARCHAR NOT NULL,
                level VARCHAR NOT NULL,
                topic VARCHAR,
                total_messages INTEGER DEFAULT 0,
                total_corrections INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] conversations table created/checked")
        
        # 5. Create conversation_messages table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id),
                role VARCHAR NOT NULL,
                content TEXT NOT NULL,
                original_text TEXT,
                is_corrected INTEGER DEFAULT 0,
                correction_data TEXT,
                audio_url VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] conversation_messages table created/checked")
        
        conn.commit()
        print("\n[SUCCESS] Migration completed!")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

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
        
        # Add language if missing
        if 'language' not in columns:
            cursor.execute("ALTER TABLE transcripts ADD COLUMN language VARCHAR")
            print("[OK] language column added to transcripts")
        else:
            print("[OK] language column already exists")
        
        # 3. Create transcript_ai table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transcript_ai (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transcript_id INTEGER NOT NULL REFERENCES transcripts(id),
                file_id VARCHAR NOT NULL,
                summary TEXT,
                summary_created_at DATETIME,
                keywords TEXT,
                keywords_created_at DATETIME,
                sentiment TEXT,
                sentiment_created_at DATETIME,
                category VARCHAR,
                category_confidence REAL,
                category_created_at DATETIME,
                translations TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] transcript_ai table created/checked")
        
        # 4. Create conversations table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                language VARCHAR NOT NULL,
                level VARCHAR NOT NULL,
                topic VARCHAR,
                total_messages INTEGER DEFAULT 0,
                total_corrections INTEGER DEFAULT 0,
                duration_seconds INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] conversations table created/checked")
        
        # 5. Create conversation_messages table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id),
                role VARCHAR NOT NULL,
                content TEXT NOT NULL,
                original_text TEXT,
                is_corrected INTEGER DEFAULT 0,
                correction_data TEXT,
                audio_url VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] conversation_messages table created/checked")
        
        conn.commit()
        print("\n[SUCCESS] Migration completed!")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
