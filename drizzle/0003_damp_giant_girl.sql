ALTER TABLE "anexos" ADD COLUMN "nota_id" uuid;--> statement-breakpoint
ALTER TABLE "notas" ADD COLUMN "autor_user_id" uuid;--> statement-breakpoint
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_nota_id_notas_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_autor_user_id_usuarios_id_fk" FOREIGN KEY ("autor_user_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" DROP COLUMN "anexo_nome";