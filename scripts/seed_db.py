import csv
import json
import sys
import os

# Add the root directory to sys.path so we can import api modules
sys.path.append(os.getcwd())

from sqlmodel import Session, select
from api.database import engine, create_db_and_tables
from api.models import Channel, Bonus, Surcharge, Segment

def seed_data():
    create_db_and_tables()
    with Session(engine) as session:
        # 1. Channels
        if not session.exec(select(Channel)).first():
            print("Seeding Channels...")
            with open('data/channels.csv', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    channel = Channel(
                        channel_name=row['channel_name'],
                        base_cpv=float(row['base_cpv']),
                        cpv_audience=float(row['cpv_audience']),
                        cpv_non_target=float(row['cpv_non_target'])
                    )
                    session.add(channel)

        # 2. Bonuses
        if not session.exec(select(Bonus)).first():
            print("Seeding Bonuses...")
            with open('data/bonuses.csv', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    bonus = Bonus(
                        channel_name=row['channel_name'],
                        bonus_type=row['bonus_type'],
                        condition_type=row['condition_type'] if row['condition_type'] else None,
                        min_value=float(row['min_value']),
                        rate=float(row['rate']),
                        description=row['description']
                    )
                    session.add(bonus)

        # 3. Surcharges
        if not session.exec(select(Surcharge)).first():
            print("Seeding Surcharges...")
            with open('data/surcharges.csv', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    surcharge = Surcharge(
                        channel_name=row['channel_name'],
                        surcharge_type=row['surcharge_type'],
                        condition_value=row['condition_value'] if row['condition_value'] else None,
                        rate=float(row['rate']),
                        description=row['description']
                    )
                    session.add(surcharge)

        # 4. Segments
        if not session.exec(select(Segment)).first():
            print("Seeding Segments...")
            with open('data/segments.json', encoding='utf-8') as f:
                data = json.load(f)
                for item in data['data']:
                    # Construct full path
                    cat1 = item.get('대분류')
                    cat2 = item.get('중분류')
                    cat3 = item.get('소분류')
                    name = item.get('name')

                    full_path = ""
                    if cat3:
                        full_path = f"{cat1} > {cat2} > {cat3} > {name}"
                    else:
                        full_path = f"{cat1} > {cat2} > {name}"

                    segment = Segment(
                        name=name,
                        description=item.get('description'),
                        category_large=cat1,
                        category_mid=cat2,
                        category_small=cat3,
                        recommended_advertisers=item.get('recommended_advertisers'),
                        full_path=full_path
                    )
                    session.add(segment)

        session.commit()
        print("Database seeded successfully.")

if __name__ == "__main__":
    seed_data()
