CREATE TABLE "DocumentChunk" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1024),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
