ALTER TABLE api_keys ADD COLUMN last_client_ip TEXT;
ALTER TABLE api_keys ADD COLUMN last_client_user_agent TEXT;
ALTER TABLE api_keys ADD COLUMN last_client_at TEXT;
