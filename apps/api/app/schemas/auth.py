from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)
    sex: str = Field(..., pattern="^(male|female|other)$")
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., pattern="^(admin|teacher|learner)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"