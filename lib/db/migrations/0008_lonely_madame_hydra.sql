CREATE TABLE "DocumentProcessing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"filename" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"stage" varchar DEFAULT 'upload' NOT NULL,
	"progress" serial DEFAULT 0 NOT NULL,
	"chunkCount" serial DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"metadata" json,
	"userId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DocumentProcessing_documentId_unique" UNIQUE("documentId")
);
--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD COLUMN "documentId" uuid;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD COLUMN "filename" text;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD COLUMN "chunkIndex" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "DocumentChunk" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "DocumentProcessing" ADD CONSTRAINT "DocumentProcessing_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;