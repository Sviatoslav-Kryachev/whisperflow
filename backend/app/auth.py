from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd = CryptContext(schemes=["bcrypt"])

def hash_password(p):
    # Bcrypt имеет ограничение на длину пароля в 72 байта
    # Обрезаем пароль до 72 байт, если он длиннее
    if isinstance(p, str):
        p_bytes = p.encode('utf-8')
        if len(p_bytes) > 72:
            p = p_bytes[:72].decode('utf-8', errors='ignore')
    return pwd.hash(p)

def verify_password(p, h):
    # При проверке тоже обрезаем пароль до 72 байт
    if isinstance(p, str):
        p_bytes = p.encode('utf-8')
        if len(p_bytes) > 72:
            p = p_bytes[:72].decode('utf-8', errors='ignore')
    return pwd.verify(p, h)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
