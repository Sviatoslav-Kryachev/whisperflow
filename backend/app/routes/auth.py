from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..auth import verify_password, create_token, hash_password

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
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.email == credentials.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Создаём нового пользователя
        hashed_password = hash_password(credentials.password)
        new_user = User(email=credentials.email, password=hashed_password)
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
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        db.close()

@router.post("/login")
async def login(credentials: LoginRequest):
    db: Session = SessionLocal()
    try:
        # Ищем пользователя по email (username)
        user = db.query(User).filter(User.email == credentials.username).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not verify_password(credentials.password, user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Создаём токен
        token = create_token({"sub": user.email, "user_id": user.id})
        
        return {"access_token": token, "token_type": "bearer"}
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

