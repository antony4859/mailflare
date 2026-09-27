ALTER TABLE mailbox_agent_settings ADD COLUMN auto_analyze_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mailbox_agent_settings ADD COLUMN auto_classify_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mailbox_agent_settings ADD COLUMN auto_mark_read_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mailbox_agent_settings ADD COLUMN auto_hindsight_read_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mailbox_agent_settings ADD COLUMN auto_hindsight_write_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN ai_summary TEXT;
ALTER TABLE messages ADD COLUMN ai_category TEXT;
ALTER TABLE agent_jobs ADD COLUMN draft_allowed INTEGER NOT NULL DEFAULT 1;
