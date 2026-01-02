import sys
import os
import json
import pandas as pd
from sqlmodel import Session, select

# Add root directory to sys.path to import api modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.db import engine, create_db_and_tables
from api.models import Channel, Bonus, Surcharge, Segment

def seed_data():
    create_db_and_tables()

    with Session(engine) as session:
        # 1. Seed Channels
        channels_df = pd.read_csv('data/channels.csv')
        existing_channels = session.exec(select(Channel)).all()
        if not existing_channels:
            print("Seeding Channels...")
            for _, row in channels_df.iterrows():
                channel = Channel(
                    channel_name=row['channel_name'],
                    base_cpv=row['base_cpv'],
                    cpv_audience=row['cpv_audience'],
                    cpv_non_target=row['cpv_non_target']
                )
                session.add(channel)

        # 2. Seed Bonuses
        bonuses_df = pd.read_csv('data/bonuses.csv')
        existing_bonuses = session.exec(select(Bonus)).all()
        if not existing_bonuses:
            print("Seeding Bonuses...")
            for _, row in bonuses_df.iterrows():
                bonus = Bonus(
                    channel_name=row['channel_name'],
                    bonus_type=row['bonus_type'],
                    condition_type=row['condition_type'],
                    min_value=row['min_value'],
                    rate=row['rate'],
                    description=row['description']
                )
                session.add(bonus)

        # 3. Seed Surcharges
        surcharges_df = pd.read_csv('data/surcharges.csv')
        existing_surcharges = session.exec(select(Surcharge)).all()
        if not existing_surcharges:
            print("Seeding Surcharges...")
            for _, row in surcharges_df.iterrows():
                surcharge = Surcharge(
                    channel_name=row['channel_name'],
                    surcharge_type=row['surcharge_type'],
                    condition_value=row['condition_value'],
                    rate=row['rate'],
                    description=row['description']
                )
                session.add(surcharge)

        # 4. Seed Segments
        # Segments are in data/segments.json
        # Format: {"data": [{"대분류": "...", "중분류": "...", "세그먼트명": "...", "세그먼트 설명": "...", "키워드": [...]}, ...]}
        try:
            with open('data/segments.json', 'r', encoding='utf-8') as f:
                segments_data = json.load(f)

            existing_segments = session.exec(select(Segment)).all()
            if not existing_segments:
                print("Seeding Segments...")
                for item in segments_data.get('data', []):
                    keywords_str = ",".join(item.get('키워드', [])) if isinstance(item.get('키워드'), list) else str(item.get('키워드', ''))
                    segment = Segment(
                        category_large=item.get('대분류', ''),
                        category_middle=item.get('중분류', ''),
                        name=item.get('세그먼트명', ''),
                        description=item.get('세그먼트 설명', ''),
                        keywords=keywords_str
                    )
                    session.add(segment)
        except Exception as e:
            print(f"Error seeding segments: {e}")

        session.commit()
        print("Database seeding completed.")

if __name__ == "__main__":
    seed_data()
