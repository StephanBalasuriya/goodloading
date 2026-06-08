import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
import psycopg2
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=BASE_DIR / ".env")


def _db_settings() -> dict:
	return {
		"host": os.getenv("DB_HOST", "localhost"),
		"port": int(os.getenv("DB_PORT", "5432")),
		"dbname": os.getenv("DB_NAME", "Stack360"),
		"user": os.getenv("DB_USER", "postgres"),
		"password": os.getenv("DB_PASSWORD", "1212"),
	}


def _sqlalchemy_database_url() -> str:
	explicit_url = os.getenv("DATABASE_URL")
	if explicit_url:
		return explicit_url

	settings = _db_settings()
	return (
		"postgresql+psycopg2://"
		f"{settings['user']}:{settings['password']}"
		f"@{settings['host']}:{settings['port']}/{settings['dbname']}"
	)


DATABASE_URL = _sqlalchemy_database_url()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


@contextmanager
def get_connection():
	database_url = os.getenv("DATABASE_URL")
	print("Using database connection:", database_url)
	conn = (
		psycopg2.connect(database_url)
		if database_url
		else psycopg2.connect(**_db_settings())
	)
	try:
		yield conn
	finally:
		conn.close()


def init_db():
	settings = _db_settings()
	# 1. Connect to postgres default DB to check if Stack360 exists, create it if not
	try:
		conn = psycopg2.connect(
			host=settings["host"],
			port=settings["port"],
			user=settings["user"],
			password=settings["password"],
			dbname="postgres"
		)
		conn.autocommit = True
		cursor = conn.cursor()
		cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = '{settings['dbname']}'")
		exists = cursor.fetchone()
		if not exists:
			print(f"Database {settings['dbname']} does not exist. Creating...")
			cursor.execute(f'CREATE DATABASE "{settings["dbname"]}"')
		else:
			print(f"Database {settings['dbname']} already exists.")
		cursor.close()
		conn.close()
	except Exception as e:
		print("Error checking/creating database:", e)

	# 2. Execute db.sql schema against Stack360
	try:
		conn = psycopg2.connect(
			host=settings["host"],
			port=settings["port"],
			user=settings["user"],
			password=settings["password"],
			dbname=settings["dbname"]
		)
		conn.autocommit = True
		cursor = conn.cursor()
		
		# Check if all required tables exist
		cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
		existing_tables = {row[0] for row in cursor.fetchall()}
		expected_tables = {
			"organizations", "app_users", "otp_verifications", 
			"organization_credentials", "gmpro_responses", 
			"vehicle_types", "vehicle_specs"
		}
		
		if not expected_tables.issubset(existing_tables):
			print("Some tables are missing. Executing db.sql to create them...")
			sql_file = BASE_DIR / "db.sql"
			if sql_file.exists():
				with open(sql_file, "r") as f:
					sql_content = f.read()
				cursor.execute(sql_content)
				print("Executed db.sql database schema successfully.")
			else:
				print(f"db.sql not found at {sql_file}")
		else:
			print("All required tables already exist in the database.")
			
		cursor.close()
		conn.close()
	except Exception as e:
		print("Error executing db.sql database schema:", e)
