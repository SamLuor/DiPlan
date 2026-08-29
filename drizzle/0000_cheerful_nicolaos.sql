CREATE TYPE "public"."nota_tipo" AS ENUM('manual', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('baixa', 'normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."situacao_entrega" AS ENUM('aguardando', 'andamento', 'concluida');--> statement-breakpoint
CREATE TYPE "public"."solicitacao_tipo" AS ENUM('revisao', 'manifestacao', 'complementacao', 'analise', 'elaboracao', 'aprovacao');--> statement-breakpoint
CREATE TYPE "public"."status_plano" AS ENUM('planejado', 'execucao', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."user_modo" AS ENUM('senha', 'convite');--> statement-breakpoint
CREATE TABLE "eixos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"chefia_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text,
	"modo" "user_modo" DEFAULT 'senha' NOT NULL,
	"eixo_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"eixo_id" uuid NOT NULL,
	"status" "status_plano" DEFAULT 'planejado' NOT NULL,
	"data_inicio" date,
	"data_fim" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entregas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"plano_id" uuid NOT NULL,
	"data_inicio" date,
	"data_prevista" date,
	"prioridade" "prioridade" DEFAULT 'normal' NOT NULL,
	"responsavel_user_id" uuid,
	"situacao" "situacao_entrega" DEFAULT 'aguardando' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anexos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrega_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrega_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"autor" text NOT NULL,
	"tipo" "nota_tipo" NOT NULL,
	"proximo_passo" text,
	"anexo_nome" text,
	"editado" boolean DEFAULT false NOT NULL,
	"excluido" boolean DEFAULT false NOT NULL,
	"data_hora" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrega_id" uuid NOT NULL,
	"tipo" "solicitacao_tipo" NOT NULL,
	"descricao" text NOT NULL,
	"prazo" date,
	"prioridade" "prioridade" DEFAULT 'normal' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solicitacao_responsaveis" (
	"solicitacao_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"respondeu" boolean DEFAULT false NOT NULL,
	"respondido_em" timestamp with time zone,
	CONSTRAINT "solicitacao_responsaveis_solicitacao_id_user_id_pk" PRIMARY KEY("solicitacao_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eixos" ADD CONSTRAINT "eixos_chefia_user_id_usuarios_id_fk" FOREIGN KEY ("chefia_user_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_eixo_id_eixos_id_fk" FOREIGN KEY ("eixo_id") REFERENCES "public"."eixos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos" ADD CONSTRAINT "planos_eixo_id_eixos_id_fk" FOREIGN KEY ("eixo_id") REFERENCES "public"."eixos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_plano_id_planos_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."planos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_responsavel_user_id_usuarios_id_fk" FOREIGN KEY ("responsavel_user_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_entrega_id_entregas_id_fk" FOREIGN KEY ("entrega_id") REFERENCES "public"."entregas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_entrega_id_entregas_id_fk" FOREIGN KEY ("entrega_id") REFERENCES "public"."entregas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_entrega_id_entregas_id_fk" FOREIGN KEY ("entrega_id") REFERENCES "public"."entregas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" ADD CONSTRAINT "solicitacao_responsaveis_solicitacao_id_solicitacoes_id_fk" FOREIGN KEY ("solicitacao_id") REFERENCES "public"."solicitacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitacao_responsaveis" ADD CONSTRAINT "solicitacao_responsaveis_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_usuarios_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;