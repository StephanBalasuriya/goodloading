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
		"dbname": os.getenv("DB_NAME", "GMPRO"),
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
