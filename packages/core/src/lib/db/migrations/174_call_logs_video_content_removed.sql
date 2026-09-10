-- Fail closed when a continuation snapshot had video transcript cues removed.
ALTER TABLE call_logs ADD COLUMN video_content_removed INTEGER NOT NULL DEFAULT 0;
