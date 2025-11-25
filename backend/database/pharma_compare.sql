-- pharma_compare.sql
-- List of all tables, sequences, types, and key objects in pharma_db for manual comparison

-- Tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Sequences
SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public' ORDER BY sequence_name;

-- Types
SELECT t.typname AS type_name FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e' ORDER BY t.typname;

-- Views
SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;

-- Indexes
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Constraints
SELECT conname, contype, conrelid::regclass AS table_name FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY table_name, conname;

-- Foreign Keys
SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS referenced_table FROM pg_constraint WHERE contype = 'f' AND connamespace = 'public'::regnamespace ORDER BY table_name, conname;

-- Columns
SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;

-- Extensions
SELECT extname FROM pg_extension ORDER BY extname;

-- Functions
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' ORDER BY routine_name;

-- Triggers
SELECT tgname, tgrelid::regclass AS table_name FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'public.%' ORDER BY table_name, tgname;

-- End of pharma_compare.sql
