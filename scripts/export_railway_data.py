#!/usr/bin/env python3
"""
Скрипт для експорту даних з Railway PostgreSQL
Використання: python scripts/export_railway_data.py
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

def export_database(database_url: str, output_file: str):
    """Експортує базу даних через pg_dump"""
    print(f"📦 Експорт бази даних в {output_file}...")
    
    try:
        # Використовуємо pg_dump для експорту
        result = subprocess.run(
            ['pg_dump', database_url, '-F', 'c', '-f', output_file],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ База даних успішно експортована: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Помилка експорту: {e.stderr}")
        return False
    except FileNotFoundError:
        print("❌ pg_dump не знайдено. Встановіть PostgreSQL клієнт:")
        print("   Windows: завантажте з postgresql.org")
        print("   Linux: sudo apt install postgresql-client")
        print("   Mac: brew install postgresql")
        return False

def export_sql_format(database_url: str, output_file: str):
    """Експортує базу даних в SQL формат (альтернатива)"""
    print(f"📦 Експорт бази даних в SQL формат: {output_file}...")
    
    try:
        result = subprocess.run(
            ['pg_dump', database_url, '-f', output_file],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ База даних успішно експортована: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Помилка експорту: {e.stderr}")
        return False
    except FileNotFoundError:
        print("❌ pg_dump не знайдено.")
        return False

def main():
    """Головна функція"""
    print("=" * 60)
    print("🚀 Експорт даних з Railway PostgreSQL")
    print("=" * 60)
    
    # Отримати DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("\n❌ DATABASE_URL не знайдено в змінних оточення")
        print("\nЯк отримати DATABASE_URL:")
        print("1. Railway Dashboard → PostgreSQL → Connect → Postgres Connection URL")
        print("2. Або через Railway CLI: railway variables")
        print("\nВведіть DATABASE_URL вручну:")
        database_url = input("DATABASE_URL: ").strip()
        
        if not database_url:
            print("❌ DATABASE_URL обов'язковий!")
            sys.exit(1)
    
    # Перевірити формат
    if not database_url.startswith(('postgresql://', 'postgres://')):
        print("❌ Невірний формат DATABASE_URL")
        sys.exit(1)
    
    # Конвертувати postgres:// в postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    # Створити директорію для бекапів
    backup_dir = Path("backups")
    backup_dir.mkdir(exist_ok=True)
    
    # Створити ім'я файлу з датою
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Експортувати в SQL формат (найпростіший)
    sql_file = backup_dir / f"whisperflow_backup_{timestamp}.sql"
    
    print(f"\n📋 Параметри експорту:")
    print(f"   База: {database_url.split('@')[1] if '@' in database_url else 'N/A'}")
    print(f"   Файл: {sql_file}")
    print()
    
    # Експорт
    success = export_sql_format(database_url, str(sql_file))
    
    if success:
        file_size = sql_file.stat().st_size / (1024 * 1024)  # MB
        print(f"\n✅ Експорт завершено успішно!")
        print(f"   Файл: {sql_file}")
        print(f"   Розмір: {file_size:.2f} MB")
        print(f"\n📝 Наступні кроки:")
        print(f"   1. Скопіюйте файл на VPS: scp {sql_file} root@your-server:/tmp/")
        print(f"   2. Імпортуйте на VPS: docker compose exec -T db psql -U user -d db < /tmp/{sql_file.name}")
    else:
        print("\n❌ Експорт не вдався. Перевірте помилки вище.")
        sys.exit(1)

if __name__ == "__main__":
    main()




