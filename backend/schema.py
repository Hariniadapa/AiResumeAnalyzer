from pydantic import BaseModel, EmailStr


# For request (Register/Login)
class User(BaseModel):
    email: EmailStr
    password: str


# Optional: Response model
class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True
