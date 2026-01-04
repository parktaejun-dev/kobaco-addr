
import sys
import os
from sqlmodel import Session, select, delete

# Add root directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.db import engine
from api.models import Segment

def reset_segments():
    with Session(engine) as session:
        statement = delete(Segment)
        session.exec(statement)
        session.commit()
        print("All segments deleted.")

if __name__ == "__main__":
    reset_segments()
