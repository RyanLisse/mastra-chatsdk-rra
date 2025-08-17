CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"message" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
