from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..auth import verify_password, create_token, hash_password
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(credentials: RegisterRequest):
    db: Session = SessionLocal()
    try:
        logger.info(f"Registration attempt for email: {credentials.email}")
        
        # Валидация email
        if not credentials.email or not credentials.email.strip():
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Валидация пароля
        if not credentials.password or len(credentials.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        logger.info("Email and password validated")
        
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.email == credentials.email.strip().lower()).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        logger.info("No existing user found, creating new user")
        
        # Создаём нового пользователя
        logger.info("Hashing password...")
        hashed_password = hash_password(credentials.password)
        logger.info("Password hashed successfully")
        
        new_user = User(email=credentials.email.strip().lower(), password=hashed_password)
        db.add(new_user)
        logger.info("User added to session, committing...")
        db.commit()
        db.refresh(new_user)
        logger.info(f"User created successfully with ID: {new_user.id}")
        
        # Создаём токен и возвращаем
        token = create_token({"sub": new_user.email, "user_id": new_user.id})
        logger.info("Token created successfully")
        
        return {"access_token": token, "token_type": "bearer", "message": "User registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Registration error: {e}\n{error_details}")
        # Возвращаем более детальную ошибку для отладки
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        db.close()

@router.post("/login")
async def login(credentials: LoginRequest):
    db: Session = SessionLocal()
    try:
        logger.info(f"Login attempt for: {credentials.username}")
        
        # Ищем пользователя по email (username) - нормализуем email
        email = credentials.username.strip().lower()
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.warning(f"User not found: {email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        logger.info(f"User found: {user.email}, verifying password...")
        
        # Проверяем пароль
        password_valid = verify_password(credentials.password, user.password)
        logger.info(f"Password verification result: {password_valid}")
        
        if not password_valid:
            logger.warning(f"Invalid password for user: {email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Создаём токен
        token = create_token({"sub": user.email, "user_id": user.id})
        logger.info(f"Login successful for: {email}")
        
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Login failed")
    finally:
        db.close()

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # Заглушка для восстановления пароля
    # В будущем здесь можно добавить отправку email с токеном сброса
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == request.email).first()
        if not user:
            # Не раскрываем, существует ли пользователь (безопасность)
            return {"message": "Если пользователь с таким email существует, инструкции отправлены"}
        return {"message": "Инструкции по восстановлению пароля отправлены на ваш email (функция в разработке)"}
    finally:
        db.close()

