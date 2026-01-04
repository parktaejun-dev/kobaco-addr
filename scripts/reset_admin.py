
import sys
import os
from sqlmodel import Session, select

# 루트 디렉토리를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.db import engine
from api.models import AdminUser
from api.auth import get_password_hash

def reset_admin():
    with Session(engine) as session:
        user = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        new_password = "admin"
        hashed_pw = get_password_hash(new_password)
        
        if not user:
            print("Admin user not found, creating new one...")
            user = AdminUser(username="admin", password_hash=hashed_pw)
            session.add(user)
        else:
            print(f"Resetting password for existing admin user...")
            user.password_hash = hashed_pw
            session.add(user)
            
        session.commit()
        print("Successfully reset admin password to 'admin'")

if __name__ == "__main__":
    reset_admin()
