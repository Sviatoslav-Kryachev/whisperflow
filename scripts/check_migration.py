#!/usr/bin/env python3
"""
Скрипт для перевірки готовності до міграції
Перевіряє всі необхідні компоненти та налаштування
"""

import os
import sys
import subprocess
from pathlib import Path

def check_docker():
    """Перевірити наявність Docker"""
    try:
        result = subprocess.run(['docker', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ Docker не встановлено")
    print("   Встановіть: curl -fsSL https://get.docker.com | sh")
    return False

def check_docker_compose():
    """Перевірити наявність Docker Compose"""
    try:
        result = subprocess.run(['docker', 'compose', 'version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker Compose: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ Docker Compose не встановлено")
    print("   Встановіть: apt install docker-compose-plugin")
    return False

def check_postgresql_client():
    """Перевірити наявність PostgreSQL клієнта"""
    try:
        result = subprocess.run(['psql', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ PostgreSQL клієнт: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("⚠️  PostgreSQL клієнт не встановлено (потрібен для експорту)")
    print("   Встановіть: apt install postgresql-client")
    return False

def check_project_files():
    """Перевірити наявність необхідних файлів"""
    required_files = [
        'Dockerfile',
        'docker-compose.yml',
        'env.example',
        'backend/app/main.py',
        'backend/requirements.txt'
    ]
    
    all_present = True
    for file in required_files:
        if Path(file).exists():
            print(f"✅ {file}")
        else:
            print(f"❌ {file} не знайдено")
            all_present = False
    
    return all_present

def check_env_file():
    """Перевірити .env файл"""
    env_file = Path('.env')
    if env_file.exists():
        print("✅ .env файл існує")
        
        # Перевірити важливі змінні
        env_vars = {}
        with open(env_file) as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value
        
        required_vars = ['DATABASE_URL', 'SECRET_KEY']
        for var in required_vars:
            if var in env_vars:
                if var == 'SECRET_KEY' and len(env_vars[var]) < 32:
                    print(f"⚠️  {var} занадто короткий (мінімум 32 символи)")
                elif var == 'SECRET_KEY' and 'change-this' in env_vars[var].lower():
                    print(f"⚠️  {var} не змінено з прикладу")
                else:
                    print(f"✅ {var} налаштовано")
            else:
                print(f"❌ {var} відсутній в .env")
        
        return True
    else:
        print("⚠️  .env файл не знайдено")
        print("   Створіть: cp env.example .env")
        return False

def check_disk_space():
    """Перевірити вільне місце на диску"""
    try:
        result = subprocess.run(['df', '-h', '/'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            if len(lines) > 1:
                parts = lines[1].split()
                if len(parts) >= 4:
                    available = parts[3]
                    print(f"✅ Вільне місце: {available}")
                    return True
    except:
        pass
    
    print("⚠️  Не вдалося перевірити вільне місце")
    return False

def check_ports():
    """Перевірити доступність портів"""
    ports_to_check = [8000, 5432]
    
    try:
        result = subprocess.run(['netstat', '-tuln'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            for port in ports_to_check:
                if f':{port}' in result.stdout:
                    print(f"⚠️  Порт {port} вже використовується")
                else:
                    print(f"✅ Порт {port} вільний")
            return True
    except:
        # На Windows може не працювати
        print("⚠️  Не вдалося перевірити порти (може не працювати на Windows)")
        return True

def main():
    """Головна функція"""
    print("=" * 60)
    print("🔍 Перевірка готовності до міграції")
    print("=" * 60)
    print()
    
    checks = [
        ("Docker", check_docker),
        ("Docker Compose", check_docker_compose),
        ("PostgreSQL клієнт", check_postgresql_client),
        ("Файли проекту", check_project_files),
        (".env файл", check_env_file),
        ("Вільне місце", check_disk_space),
        ("Порти", check_ports),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n📋 {name}:")
        result = check_func()
        results.append((name, result))
    
    print("\n" + "=" * 60)
    print("📊 Підсумок:")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    print(f"\nРезультат: {passed}/{total} перевірок пройдено")
    
    if passed == total:
        print("\n🎉 Всі перевірки пройдено! Готово до міграції.")
        return 0
    else:
        print("\n⚠️  Деякі перевірки не пройдено. Виправте помилки перед міграцією.")
        return 1

if __name__ == "__main__":
    sys.exit(main())




