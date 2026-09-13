-- ============================================================
-- StellarScan Database Schema (PostgreSQL version)
-- ============================================================
--
-- STEP 1 (do this FIRST, only once, before running this file):
-- Create the database itself. You can do this in one of two ways:
--
--   Option A - using the terminal:
--     createdb stellarscan_db
--
--   Option B - using psql:
--     psql -U postgres
--     CREATE DATABASE stellarscan_db;
--     \q
--
-- STEP 2: Connect to that database, then run the rest of this file:
--     psql -U postgres -d stellarscan_db -f schema.sql
--
-- (Postgres does not support "CREATE DATABASE IF NOT EXISTS",
--  which is why this is a separate manual step instead of a
--  single script like the MySQL version had.)

-- Step 3: Create the table that stores every prediction we make.
-- Each row = one signal that was analyzed by our models.
CREATE TABLE IF NOT EXISTS predictions (

    -- SERIAL automatically creates an auto-incrementing ID column.
    -- This is Postgres's equivalent of MySQL's AUTO_INCREMENT.
    id SERIAL PRIMARY KEY,

    -- The 10 input measurements the user submitted
    -- (same order as the training notebook).
    koi_period FLOAT,
    koi_duration FLOAT,
    koi_depth FLOAT,
    koi_prad FLOAT,
    koi_teq FLOAT,
    koi_insol FLOAT,
    koi_model_snr FLOAT,
    koi_steff FLOAT,
    koi_slogg FLOAT,
    koi_srad FLOAT,

    -- The results our models produced.
    predicted_class VARCHAR(50),      -- CONFIRMED / CANDIDATE / FALSE POSITIVE
    confidence FLOAT,                 -- how sure the classifier was (0 to 1)
    is_anomaly BOOLEAN,               -- was this flagged as unusual?
    priority_score FLOAT,             -- our 0-100 combined score
    fun_label VARCHAR(100),           -- the fun display label
    habitability_score VARCHAR(10),   -- 0-100 score, or "N/A" if not CONFIRMED

    -- Automatically records when this row was created.
    -- TIMESTAMP works the same way in Postgres as in MySQL here.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);