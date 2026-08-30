CREATE TYPE "public"."delegacao_status" AS ENUM('aguardando', 'andamento', 'concluido');--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" ADD COLUMN "status" "delegacao_status" DEFAULT 'aguardando' NOT NULL;--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" ADD COLUMN "iniciado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" ADD COLUMN "concluido_em" timestamp with time zone;--> statement-breakpoint
UPDATE "solicitacao_responsaveis" SET "status" = 'concluido', "concluido_em" = "respondido_em" WHERE "respondeu" = true;--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" DROP COLUMN "respondeu";--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" DROP COLUMN "respondido_em";