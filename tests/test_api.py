from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from api.main import app, get_session
from api.models import Channel, Bonus, Surcharge
import pytest

# Use in-memory SQLite for testing
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session_override():
    with Session(engine) as session:
        yield session

app.dependency_overrides[get_session] = get_session_override

client = TestClient(app)

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

def test_read_config():
    response = client.get("/api/config")
    assert response.status_code == 200
    assert "channels" in response.json()

def test_estimate_calculation():
    # Setup data is already done by seed_db.py if running in same env,
    # but for unit test ideally we should seed fixture data.
    # However, since we are using the file-based sqlite from seed_db execution in the previous steps,
    # and the fixture above recreates tables, we need to be careful.
    # Let's rely on the fact that `database.db` exists in the root from previous steps
    # and use it or mocking.
    # Actually, the fixture `session_fixture` above creates a NEW in-memory/file db if we use :memory:.
    # But here I pointed to the existing file "database.db".

    response = client.post("/api/estimate", json={
        "selected_channels": ["MBC"],
        "channel_budgets": {"MBC": 100},
        "duration": 1,
        "region_targeting": False,
        "region_selections": {},
        "audience_targeting": False,
        "ad_duration": 15,
        "custom_targeting": False,
        "is_new_advertiser": True
    })
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert data["summary"]["total_budget"] == 1000000.0
