-- Add voice_sessions table for managing voice sessions
CREATE TABLE IF NOT EXISTS "voice_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" varchar(255) UNIQUE NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"(id),
  "model" varchar(255) NOT NULL,
  "speaker" varchar(255) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'active',
  "metadata" json,
  "last_activity" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS "voice_sessions_user_id_idx" ON "voice_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "voice_sessions_last_activity_idx" ON "voice_sessions" ("last_activity");
CREATE INDEX IF NOT EXISTS "voice_sessions_status_idx" ON "voice_sessions" ("status");