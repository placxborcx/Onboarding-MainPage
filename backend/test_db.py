from sqlalchemy import create_engine, text, inspect

# RDS credentials
endpoint = "ta43-onboarding.c5kcsm8im4cz.ap-southeast-2.rds.amazonaws.com"
database = "postgres"
username = "postgres"
password = "TA43Onboarding"

# Create engine
rds_engine = create_engine(
    f"postgresql+psycopg2://{username}:{password}@{endpoint}:5432/{database}?sslmode=require"
)

try:
    with rds_engine.connect() as conn:
        # 1️⃣ Print current DB time
        db_time = conn.execute(text("SELECT now()")).scalar()
        print("DB time:", db_time, "\n")

        # 2️⃣ Inspect all tables
        inspector = inspect(rds_engine)
        tables = inspector.get_table_names()
        if not tables:
            print("No tables found in the database.")
        else:
            print(f"Found {len(tables)} table(s): {tables}\n")

        # 3️⃣ Print first 10 rows from each table
        for table in tables:
            print(f"--- Table: {table} ---")
            try:
                result = conn.execute(text(f"SELECT * FROM {table} LIMIT 10"))
                rows = result.fetchall()
                if not rows:
                    print("No rows found.")
                else:
                    for row in rows:
                        print(row)
            except Exception as e:
                print(f"Error reading table {table}: {e}")
            print("\n")

except Exception as e:
    print("Error connecting to DB:", e)
