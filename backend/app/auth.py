from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd = CryptContext(schemes=["bcrypt"])

def hash_password(p):
    """
    Хеширует пароль с помощью bcrypt.
    Bcrypt имеет ограничение на длину пароля в 72 байта.
    Обрезаем пароль до 70 байт (UTF-8), если он длиннее, для надёжности.
    """
    if not isinstance(p, str):
        p = str(p)
    
    # Кодируем в UTF-8 для правильного подсчёта байт
    p_bytes = p.encode('utf-8')
    
    # Обрезаем до 70 байт (оставляем запас), если пароль длиннее
    # Bcrypt имеет ограничение 72 байта, но лучше оставить запас
    if len(p_bytes) > 70:
        # Обрезаем байты напрямую до 70 байт
        p_bytes = p_bytes[:70]
        # Декодируем обратно (может быть меньше символов из-за обрезки)
        # Используем errors='ignore' чтобы просто пропустить некорректные байты
        p = p_bytes.decode('utf-8', errors='ignore')
        # Убеждаемся, что после декодирования всё ещё <= 70 байт
        # Используем цикл для гарантии
        while len(p.encode('utf-8')) > 70 and len(p) > 0:
            p = p[:-1]
    
    return pwd.hash(p)

def verify_password(p, h):
    """
    Проверяет пароль с помощью bcrypt.
    При проверке тоже обрезаем пароль до 70 байт, если он длиннее.
    """
    if not isinstance(p, str):
        p = str(p)
    
    # Кодируем в UTF-8 для правильного подсчёта байт
    p_bytes = p.encode('utf-8')
    
    # Обрезаем до 70 байт, если пароль длиннее (та же логика, что и в hash_password)
    if len(p_bytes) > 70:
        p_bytes = p_bytes[:70]
        p = p_bytes.decode('utf-8', errors='ignore')
        # Используем цикл для гарантии
        while len(p.encode('utf-8')) > 70 and len(p) > 0:
            p = p[:-1]
    
    return pwd.verify(p, h)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
