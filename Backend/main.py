from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# ✅ FIXED: Allow both Vite (5173) and Create React App (3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Create React App
        "http://localhost:5173",  # Vite
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://127.0.0.1:5173",  # Alternative localhost
    ],
    allow_credentials=True,  # ✅ Add this
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request model
class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


# Dummy users with complete details
USERS = [
    {
        "name": "Mohan Sharma",
        "email": "mohansharma@abcbank.com",
        "password": "123456",
        "role": "Risk Analyst",
        "contact": "+91 98765 43210",
    },
    {
        "name": "Admin User",
        "email": "admin@bank.com",
        "password": "admin123",
        "role": "Administrator",
        "contact": "+91 99999 88888",
    },
]


@app.get("/")
def read_root():
    return {"message": "Fraud Detection API is running!"}


@app.post("/login")
def login(data: LoginRequest):
    for user in USERS:
        if (
            user["email"] == data.email
            and user["password"] == data.password
            and user["role"] == data.role
        ):
            # Return user details (don't send password)
            return {
                "message": "Login successful",
                "user": {
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "contact": user["contact"],
                },
            }

    raise HTTPException(status_code=401, detail="Invalid credentials")
