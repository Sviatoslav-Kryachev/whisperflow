import bcrypt
from jose import jwt
from datetime import datetime, timedelta
from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

def hash_password(p):
    """
    Хеширует пароль с помощью bcrypt.
    Bcrypt имеет ограничение на длину пароля в 72 байта.
    Обрезаем пароль до 72 байт (UTF-8), если он длиннее.
    """
    if not isinstance(p, str):
        p = str(p)
    
    # Кодируем в UTF-8 для правильного подсчёта байт
    p_bytes = p.encode('utf-8')
    
    # Обрезаем до 72 байт, если пароль длиннее (bcrypt лимит)
    if len(p_bytes) > 72:
        p_bytes = p_bytes[:72]
    
    # Хешируем пароль напрямую через bcrypt
    # bcrypt.hashpw принимает байты и возвращает байты
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(p_bytes, salt)
    
    # Возвращаем строку (passlib ожидает строку, но мы используем bcrypt напрямую)
    return hashed.decode('utf-8')

def verify_password(p, h):
    """
    Проверяет пароль с помощью bcrypt.
    При проверке тоже обрезаем пароль до 72 байт, если он длиннее.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if not isinstance(p, str):
        p = str(p)
    
    if not h:
        logger.warning("Hash is empty or None")
        return False
    
    try:
        # Кодируем пароль в UTF-8
        p_bytes = p.encode('utf-8')
        logger.debug(f"Password bytes length: {len(p_bytes)}")
        
        # Обрезаем до 72 байт, если пароль длиннее (та же логика, что и в hash_password)
        if len(p_bytes) > 72:
            p_bytes = p_bytes[:72]
            logger.debug(f"Password truncated to 72 bytes")
        
        # Кодируем хеш в байты
        h_bytes = h.encode('utf-8') if isinstance(h, str) else h
        logger.debug(f"Hash bytes length: {len(h_bytes)}, Hash prefix: {h_bytes[:10] if len(h_bytes) > 10 else h_bytes}")
        
        # Проверяем пароль через bcrypt
        result = bcrypt.checkpw(p_bytes, h_bytes)
        if not result:
            logger.warning(f"Password verification failed. Password length: {len(p)}, Hash prefix: {str(h)[:20] if h else 'None'}")
        return result
    except ValueError as e:
        # ValueError может возникнуть, если хеш в неправильном формате
        logger.error(f"ValueError verifying password (possibly invalid hash format): {e}")
        logger.error(f"Hash value (first 50 chars): {str(h)[:50] if h else 'None'}")
        return False
    except Exception as e:
        logger.error(f"Error verifying password: {e}", exc_info=True)
        logger.error(f"Hash value (first 50 chars): {str(h)[:50] if h else 'None'}")
        return False

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
