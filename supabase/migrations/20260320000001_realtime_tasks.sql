-- Enable Supabase Realtime for the tasks table
-- Required for useTasks Realtime subscription to receive postgres_changes
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
