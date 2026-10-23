ALTER TABLE proxy_logs ADD COLUMN proxy_name TEXT;

-- Recover names only when the recorded endpoint identifies one registry name.
UPDATE proxy_logs
SET proxy_name = (
  SELECT MIN(p.name) FROM proxy_registry p
  WHERE p.type = proxy_logs.proxy_type
    AND p.host = proxy_logs.proxy_host
    AND p.port = proxy_logs.proxy_port
)
WHERE proxy_name IS NULL
  AND proxy_host IS NOT NULL
  AND (
    SELECT COUNT(DISTINCT p.name) FROM proxy_registry p
    WHERE p.type = proxy_logs.proxy_type
      AND p.host = proxy_logs.proxy_host
      AND p.port = proxy_logs.proxy_port
  ) = 1;
