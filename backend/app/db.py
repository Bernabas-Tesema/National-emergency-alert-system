import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .env import load_local_env

load_local_env()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./national_alerts.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_sqlite_columns() -> None:
    """Add columns introduced after the first local database was created."""
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        rows = conn.exec_driver_sql("PRAGMA table_info(cases)").fetchall()
        if not rows:
            return
        names = {row[1] for row in rows}
        additions = {
            "title": "ALTER TABLE cases ADD COLUMN title VARCHAR(200) DEFAULT '' NOT NULL",
            "created_by": "ALTER TABLE cases ADD COLUMN created_by VARCHAR(128)",
            "review_comment": "ALTER TABLE cases ADD COLUMN review_comment TEXT",
        }
        for column, statement in additions.items():
            if column not in names:
                conn.exec_driver_sql(statement)
