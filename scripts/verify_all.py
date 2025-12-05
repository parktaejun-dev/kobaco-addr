import os
import sys
import subprocess
import requests
import time
from sqlmodel import Session, select, create_engine
from api.models import Channel, Segment

# Add current dir to path
sys.path.append(os.getcwd())

def test_db():
    print("Testing DB...")
    # Use the DB URL from env or default
    db_url = os.getenv("DATABASE_URL", "sqlite:///./kobata.db")
    engine = create_engine(db_url)
    try:
        with Session(engine) as session:
            channels = session.exec(select(Channel)).all()
            segments = session.exec(select(Segment)).all()

            if not channels:
                print("❌ No channels found in DB.")
                return False
            if not segments:
                print("❌ No segments found in DB.")
                return False
            print(f"✅ Found {len(channels)} channels and {len(segments)} segments.")
            return True
    except Exception as e:
        print(f"❌ DB connection failed: {e}")
        return False

def test_backend_api():
    print("Testing Backend API...")
    # Start server in background
    proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8001"])
    time.sleep(5) # Wait for startup

    success = False
    try:
        # 1. Test System Init
        resp = requests.get("http://127.0.0.1:8001/api/system/init")
        if resp.status_code == 200:
            data = resp.json()
            if "channels" in data and "segments" in data:
                print("✅ /api/system/init working.")
                success = True
            else:
                print(f"❌ /api/system/init returned unexpected structure: {data.keys()}")
                success = False
        else:
             print(f"❌ /api/system/init failed with {resp.status_code}")
             success = False

        if not success: return False

        # 2. Test Estimate
        payload = {
            "budget": 30000000,
            "channel_allocations": {"MBC": 2000, "EBS": 1000},
            "duration": 3,
            "is_new_advertiser": True
        }
        resp = requests.post("http://127.0.0.1:8001/api/biz/estimate", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            if "summary" in data and "details" in data:
                print("✅ /api/biz/estimate working.")
            else:
                print(f"❌ /api/biz/estimate returned unexpected structure.")
                success = False
        else:
            print(f"❌ /api/biz/estimate failed with {resp.status_code} - {resp.text}")
            success = False

    except Exception as e:
        print(f"❌ API test failed with exception: {e}")
        success = False
    finally:
        proc.kill()

    return success

def test_frontend_build():
    print("Testing Frontend Build...")
    # We already ran npm run build in the previous step, but let's check if .next exists
    if os.path.exists(".next"):
        print("✅ Frontend build artifact (.next) exists.")
        return True
    else:
        print("❌ Frontend build artifact missing.")
        return False

if __name__ == "__main__":
    db_ok = test_db()
    api_ok = test_backend_api()
    fe_ok = test_frontend_build()

    if db_ok and api_ok and fe_ok:
        print("\n🎉 All verifications passed!")
        sys.exit(0)
    else:
        print("\n❌ Verification failed.")
        sys.exit(1)
