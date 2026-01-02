from sqlmodel import SQLModel, create_engine, Session
import os

# Use SQLite for local dev/sandbox, Postgres for production
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./database.db")

# For Postgres (Neon), we might need to replace 'postgres://' with 'postgresql://' if it comes from some providers
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
