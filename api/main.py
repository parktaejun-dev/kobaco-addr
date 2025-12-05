from fastapi import FastAPI
from api.routers import system, biz
from api.database import create_db_and_tables

app = FastAPI(title="KOBA-TA API")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(system.router)
app.include_router(biz.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to KOBA-TA API"}
