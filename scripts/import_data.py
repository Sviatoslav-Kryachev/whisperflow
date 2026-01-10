#!/usr/bin/env python3
"""
Скрипт для імпорту даних в PostgreSQL на VPS
Використання: python scripts/import_data.py backup.sql
"""

import os
import sys
import subprocess
from pathlib import Path

def import_database(database_url: str, sql_file: str):
    """Імпортує базу даних з SQL файлу"""
    print(f"📦 Імпорт бази даних з {sql_file}...")
    
    if not Path(sql_file).exists():
        print(f"❌ Файл не знайдено: {sql_file}")
        return False
    
    try:
        # Відкрити файл та передати в psql
        with open(sql_file, 'r', encoding='utf-8') as f:
            result = subprocess.run(
                ['psql', database_url],
                stdin=f,
                capture_output=True,
                text=True,
                check=True
            )
        print(f"✅ База даних успішно імпортована!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Помилка імпорту: {e.stderr}")
        if "already exists" in e.stderr.lower():
            print("\n⚠️  Таблиці вже існують. Можливо потрібно:")
            print("   1. Видалити старі таблиці")
            print("   2. Або використати --clean при експорті")
        return False
    except FileNotFoundError:
        print("❌ psql не знайдено. Встановіть PostgreSQL клієнт")
        return False

def import_via_docker_compose(sql_file: str):
    """Імпортує через docker-compose (для VPS)"""
    print(f"📦 Імпорт через Docker Compose з {sql_file}...")
    
    if not Path(sql_file).exists():
        print(f"❌ Файл не знайдено: {sql_file}")
        return False
    
    # Перевірити, чи є docker-compose.yml
    compose_file = Path("docker-compose.yml")
    if not compose_file.exists():
        print("❌ docker-compose.yml не знайдено")
        print("   Запустіть скрипт з директорії проекту")
        return False
    
    try:
        # Скопіювати файл в контейнер та імпортувати
        sql_path = Path(sql_file).absolute()
        
        # Варіант 1: Через stdin
        with open(sql_file, 'r', encoding='utf-8') as f:
            result = subprocess.run(
                ['docker', 'compose', 'exec', '-T', 'db', 'psql', 
                 '-U', 'whisperflow_user', '-d', 'whisperflow'],
                stdin=f,
                capture_output=True,
                text=True,
                check=True
            )
        
        print(f"✅ База даних успішно імпортована через Docker!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Помилка імпорту: {e.stderr}")
        return False
    except FileNotFoundError:
        print("❌ docker compose не знайдено")
        return False

def main():
    """Головна функція"""
    print("=" * 60)
    print("🚀 Імпорт даних в PostgreSQL")
    print("=" * 60)
    
    # Перевірити аргументи
    if len(sys.argv) < 2:
        print("\n❌ Потрібно вказати файл для імпорту")
        print("\nВикористання:")
        print("  python scripts/import_data.py backup.sql")
        print("\nАбо для Docker Compose:")
        print("  python scripts/import_data.py backup.sql --docker")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    use_docker = '--docker' in sys.argv or 'docker-compose.yml' in os.listdir('.')
    
    if use_docker:
        # Імпорт через Docker Compose
        success = import_via_docker_compose(sql_file)
    else:
        # Імпорт напряму
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("\n❌ DATABASE_URL не знайдено")
            print("Введіть DATABASE_URL:")
            database_url = input("DATABASE_URL: ").strip()
            
            if not database_url:
                print("❌ DATABASE_URL обов'язковий!")
                sys.exit(1)
        
        # Конвертувати postgres:// в postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        
        success = import_database(database_url, sql_file)
    
    if success:
        print("\n✅ Імпорт завершено успішно!")
        print("\n📝 Перевірте дані:")
        print("   docker compose exec db psql -U whisperflow_user -d whisperflow")
        print("   SELECT COUNT(*) FROM users;")
    else:
        print("\n❌ Імпорт не вдався. Перевірте помилки вище.")
        sys.exit(1)

if __name__ == "__main__":
    main()




