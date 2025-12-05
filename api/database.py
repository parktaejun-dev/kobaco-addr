from sqlmodel import SQLModel, create_engine, Session
import os

# For sandbox, we use SQLite. In production (Neon), this will be a Postgres URL.
# SOW says DATABASE_URL will be provided in env.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kobata.db")

engine = create_engine(DATABASE_URL, echo=False)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
