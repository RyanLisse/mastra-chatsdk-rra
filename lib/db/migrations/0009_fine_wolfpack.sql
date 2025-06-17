ALTER TABLE "DocumentProcessing" ALTER COLUMN "progress" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "DocumentProcessing" ALTER COLUMN "progress" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "DocumentProcessing" ALTER COLUMN "chunkCount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "DocumentProcessing" ALTER COLUMN "chunkCount" DROP NOT NULL;