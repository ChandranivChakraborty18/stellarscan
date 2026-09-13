# ============================================================
# config.py
# ============================================================
# This file reads your database login details from a separate
# ".env" file, so you never type your real password directly
# into app.py (good habit, especially before pushing to GitHub).

import os
from dotenv import load_dotenv

# This line reads the .env file and loads its values into memory.
load_dotenv()

# We read each value using os.getenv().
# The second argument is a fallback/default value, used only if
# the .env file does not have that key.

DB_HOST = os.getenv("DB_HOST", "localhost")

# PostgreSQL's default port is 5432 (MySQL's was 3306 - this is
# the most common mistake when switching, so it's called out here).
DB_PORT = os.getenv("DB_PORT", "5432")

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "stellarscan_db")