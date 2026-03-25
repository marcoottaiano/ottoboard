-- Story 7.1: Remove Projects Module and Linear Integration
-- This migration removes all data related to the Projects/Kanban module and Linear integration.

-- Remove kanban-column widgets from dashboard
DELETE FROM dashboard_widgets WHERE type = 'kanban-column';

-- Remove Linear tokens (table is linear_tokens, not user_integrations)
DROP TABLE IF EXISTS linear_tokens CASCADE;

-- Drop project tables (tasks first due to FK constraints, then columns, then projects)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
