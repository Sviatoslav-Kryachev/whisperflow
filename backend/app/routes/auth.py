from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..auth import verify_password, create_token, hash_password, create_reset_token, verify_reset_token
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
        # Валидация email
        if not credentials.email or not credentials.email.strip():
            raise HTTPException(status_code=400, detail="Email is required")
        
        # Валидация пароля
        if not credentials.password or len(credentials.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.email == credentials.email.strip().lower()).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Создаём нового пользователя
        hashed_password = hash_password(credentials.password)
        new_user = User(email=credentials.email.strip().lower(), password=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Создаём токен и возвращаем
        token = create_token({"sub": new_user.email, "user_id": new_user.id})
        
        return {"access_token": token, "token_type": "bearer", "message": "User registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed")
    finally:
        db.close()

@router.post("/login")
async def login(credentials: LoginRequest):
    db: Session = SessionLocal()
    try:
        # Ищем пользователя по email (username) - нормализуем email
        email = credentials.username.strip().lower()
        logger.info(f"Login attempt for email: {email}")
        
        # Проверяем количество пользователей в базе для диагностики
        total_users = db.query(User).count()
        logger.info(f"Total users in database: {total_users}")
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            logger.warning(f"User not found: {email} (total users in DB: {total_users})")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        logger.info(f"User found: {user.email} (ID: {user.id})")
        
        # Проверяем пароль
        password_valid = verify_password(credentials.password, user.password)
        
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
    """Генерирует токен для сброса пароля"""
    db: Session = SessionLocal()
    try:
        email = request.email.strip().lower()
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Не раскрываем, существует ли пользователь (безопасность)
            return {
                "message": "Если пользователь с таким email существует, токен сброса будет показан ниже",
                "token": None
            }
        
        # Генерируем токен сброса
        reset_token = create_reset_token(user.email, user.id)
        
        # В реальном приложении токен должен отправляться на email
        # Здесь показываем его напрямую для удобства
        return {
            "message": "Токен для сброса пароля (действителен 1 час):",
            "token": reset_token,
            "instructions": "Скопируйте этот токен и используйте его на странице сброса пароля"
        }
    finally:
        db.close()

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Сбрасывает пароль по токену"""
    db: Session = SessionLocal()
    try:
        # Валидация пароля
        if not request.new_password or len(request.new_password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        # Проверяем токен
        token_data = verify_reset_token(request.token)
        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Находим пользователя
        user = db.query(User).filter(User.email == token_data["email"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Обновляем пароль
        user.password = hash_password(request.new_password)
        db.commit()
        
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Password reset error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Password reset failed")
    finally:
        db.close()

