ALTER TABLE "anexos" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "anexos" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "anexos" ADD COLUMN "tamanho" integer;--> statement-breakpoint
-- Backfill de linhas pré-existentes (anexos eram só metadado de nome, sem arquivo real) com
-- um placeholder óbvio — não aponta pra objeto nenhum no S3, então baixar vai falhar (esperado).
UPDATE "anexos" SET "key" = 'legacy/' || "id", "content_type" = 'application/octet-stream', "tamanho" = 0 WHERE "key" IS NULL;--> statement-breakpoint
ALTER TABLE "anexos" ALTER COLUMN "key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "anexos" ALTER COLUMN "content_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "anexos" ALTER COLUMN "tamanho" SET NOT NULL;