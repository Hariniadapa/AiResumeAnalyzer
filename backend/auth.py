from fastapi import HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from utils import create_access_token
from models import UserDB
from schema import User
from database import get_db

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# ==========================
# REGISTER USER
# ==========================
def register_user(user: User, db: Session):
    existing_user = db.query(UserDB).filter(UserDB.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd_context.hash(user.password)

    new_user = UserDB(
        email=user.email,
        hashed_password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully ✅"}


# ==========================
# LOGIN USER
# ==========================
def login_user(user: User, db: Session):
    db_user = db.query(UserDB).filter(UserDB.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")

    if not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Wrong password")

    access_token = create_access_token({"sub": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
