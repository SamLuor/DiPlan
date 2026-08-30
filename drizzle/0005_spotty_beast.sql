CREATE TYPE "public"."perfil" AS ENUM('diretoria', 'chefia', 'operacional');--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "perfil" "perfil" DEFAULT 'operacional' NOT NULL;