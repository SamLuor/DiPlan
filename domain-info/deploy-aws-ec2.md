# Deploy na AWS (EC2 + Docker Compose) — homologação/demo

> Guia de deploy, seguindo Spec Driven Development (`CLAUDE.md`). Alternativa ao Railway (`domain-info/deploy-railway.md`, não usada): uma única instância EC2 rodando app + Postgres via Docker Compose, igual ao padrão já usado em dev (`docker-compose.yml`) — só que numa máquina na AWS em vez de local.

## Por que essa arquitetura

A opção mais simples e barata pra esse porte de app (uso interno, poucos usuários) é 1 instância pequena rodando tudo via Docker, em vez de serviços gerenciados separados (RDS + ECS/App Runner), que custariam bem mais (~$25–40/mês) pra um ganho de robustez que essa aplicação não precisa agora.

**Custo estimado**: instância `t3.micro` (região `us-east-1`) ≈ $7,50/mês + volume EBS 8GB gp3 ≈ $0,65/mês + IP elástico (grátis enquanto anexado a uma instância rodando) ≈ **~$8/mês total**. Se sua conta tiver créditos gratuitos disponíveis (trial de conta nova ou promoção), esse valor sai do saldo de créditos em vez do cartão — confira em **Billing and Cost Management → Credits** no console antes de começar, pra saber quanto tempo esse valor mensal dura sem cobrar nada.

## Arquivos deste repositório usados no deploy

- **`Dockerfile`** — build multi-stage: instala dependências, roda `pnpm run build` (`vite build && tsc --noEmit`), imagem final só com `.output/`, `node_modules`, migrations e o schema (necessário pro `drizzle-kit migrate` em runtime).
- **`docker-compose.prod.yml`** — dois serviços: `postgres` (sem porta exposta ao host — só a `app` acessa, via rede interna do Docker) e `app` (builda a partir do `Dockerfile`, expõe porta 80→3000).
- **`.env.production.example`** — template das variáveis de ambiente; copiar para `.env.production` na instância (nunca commitar o preenchido).

## Passo a passo (tudo pelo console web da AWS)

### 0. (Opcional, recomendado) Usuário IAM dedicado a este projeto

Se você usa a mesma conta AWS pra outros projetos, vale isolar o acesso em vez de usar o usuário root ou uma credencial de outro projeto:

1. Console → **IAM** → **Users** → **Create user**
2. Nome: `diplan-deploy` (ou o que preferir)
3. Marque **Provide user access to the AWS Management Console** se quiser logar com esse usuário pelo navegador (senha própria, não a do root)
4. Em permissões, **Attach policies directly** → busque e marque `AmazonEC2FullAccess` (suficiente pra tudo deste guia — não precisa de Administrator)
5. Criar, guardar a senha temporária gerada (você troca no primeiro login)

Daqui em diante, logue no console com esse usuário pra fazer os passos seguintes.

### 1. Provisionar a instância EC2

No console AWS, confirme a região no canto superior direito: **N. Virginia (us-east-1)**.

1. Busque **EC2** no menu superior → **Launch Instance**
2. **Name**: `diplan-app`
3. **Application and OS Images (AMI)**: procure e selecione **Amazon Linux 2023 AMI** (arquitetura x86_64, mantém compatibilidade simples)
4. **Instance type**: `t3.micro`
5. **Key pair (login)**: clique **Create new key pair**
   - Nome: `diplan-key`
   - Tipo: RSA, formato **.pem** (Linux/Mac) ou **.ppk** (se for usar PuTTY no Windows)
   - Ao clicar em criar, o navegador baixa o arquivo da chave privada automaticamente — **guarde esse arquivo, ele não pode ser baixado de novo depois**. No Linux/Mac, rode `chmod 400 caminho/diplan-key.pem` pra restringir a permissão (SSH recusa a chave se estiver aberta demais).
6. **Network settings** → **Edit**:
   - VPC/subnet: pode deixar o padrão
   - **Auto-assign public IP**: Enable
   - **Firewall (security groups)**: Create security group, nome `diplan-sg`
     - Regra 1: SSH, porta 22, **Source: My IP** (não `0.0.0.0/0` — restringe ao seu IP atual)
     - Regra 2: adicione uma regra HTTP, porta 80, **Source: Anywhere (0.0.0.0/0)**
     - (porta 443 só se/quando configurar HTTPS com domínio — ver seção final)
7. **Configure storage**: 8 GiB, tipo **gp3** já é suficiente
8. **Launch instance**

Depois que a instância estiver com status **Running**:

9. No painel EC2 → **Elastic IPs** (menu lateral, em Network & Security) → **Allocate Elastic IP address** → Allocate
10. Selecione o IP recém-criado → **Actions → Associate Elastic IP address** → escolha a instância `diplan-app` → Associate

Isso garante que o IP público não muda se a instância for reiniciada. Anote esse IP — é o `SEU_IP` usado no resto do guia, e também o valor de `APP_URL` no `.env.production`.

### 1.5. Bucket S3 (upload de anexos) e IAM role da instância

A aplicação agora faz upload real de anexos pro S3 (`src/server/infra/storage/s3.server.ts`), usando URLs pré-assinadas — o arquivo vai direto do navegador pro S3, sem passar pelo servidor. O bucket fica **privado** (sem acesso público); a app só acessa via credenciais da IAM role da instância, nunca chave/segredo fixos no `.env`.

**Criar o bucket:**
1. Console → **S3** → **Create bucket**
2. Nome: `diplan-anexos-<algo único>` (nomes de bucket S3 são globais, precisa ser único mundialmente)
3. Região: mesma da instância (`us-east-1`)
4. **Block Public Access**: manter todas as opções marcadas (bucket 100% privado)
5. Create bucket

**Criar a IAM role e anexar à instância:**
1. Console → **IAM** → **Roles** → **Create role**
2. Trusted entity: **AWS service** → **EC2**
3. Não anexe nenhuma policy gerenciada ainda — crie uma inline depois de nomear a role (`diplan-ec2-s3`)
4. Na role criada → **Add permissions → Create inline policy** → aba JSON:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::NOME-DO-SEU-BUCKET/*"
       }
     ]
   }
   ```
   (troque `NOME-DO-SEU-BUCKET` pelo nome real criado acima — a policy só dá acesso a esse bucket específico, nada além)
5. **EC2** → selecione a instância `diplan-app` → **Actions → Security → Modify IAM role** → escolha `diplan-ec2-s3` → Update

**Importante — hop limit do IMDS**: como a app roda dentro de um container Docker, ela fica um "salto de rede" a mais de distância do serviço de metadados da instância (de onde a IAM role busca as credenciais temporárias). Por padrão, esse limite é 1 e bloqueia containers. Ajustar:
1. **EC2** → instância `diplan-app` → **Actions → Instance settings → Modify instance metadata options**
2. **Metadata response hop limit**: mudar de `1` para `2`
3. Save

Sem esse ajuste, o SDK dentro do container não consegue buscar a credencial da role e o upload falha com erro de credenciais — se isso acontecer depois do deploy, é o primeiro lugar a checar.

### 2. Instalar Docker na instância

Via SSH (`ssh -i diplan-key.pem ec2-user@SEU_IP`):

```bash
sudo dnf update -y
sudo dnf install -y docker git

# Swap — o t3.micro só tem 1GB de RAM, e o build (vite build + tsc) do container
# estoura isso sozinho ("JavaScript heap out of memory"). 2GB de swap resolve.
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
free -h   # confirma que o swap apareceu
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
# Desloga e reconecta o SSH pra o grupo `docker` valer

# Docker Compose v2 (plugin) — Amazon Linux 2023 não traz por padrão
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose   # troque x86_64→aarch64 se tiver usado um tipo de instância ARM (ex. t4g.micro)
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version   # confirma que instalou

# Buildx (plugin) — o Compose v2 exige pra build de imagem, Amazon Linux 2023 também não traz
BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name"' | cut -d '"' -f4)
sudo curl -SL "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-amd64" \
  -o /usr/local/lib/docker/cli-plugins/docker-buildx   # troque linux-amd64→linux-arm64 se tiver usado um tipo de instância ARM (ex. t4g.micro)
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
docker buildx version   # confirma que instalou
```

### 3. Clonar o repositório e configurar o ambiente

A instância não tem (nem deve ter) a sua chave SSH pessoal do GitHub. O jeito certo é uma **Deploy Key**: uma chave só de leitura, específica deste repositório, gerada direto na instância.

**Gerar a chave na instância:**
```bash
ssh-keygen -t ed25519 -C "diplan-ec2-deploy" -f ~/.ssh/diplan_deploy_key -N ""
cat ~/.ssh/diplan_deploy_key.pub
```
Copie a saída do `cat` (começa com `ssh-ed25519 ...`).

**Cadastrar no GitHub:**
1. No repositório (github.com/SamLuor/DiPlan) → **Settings → Deploy keys → Add deploy key**
2. Title: `EC2 diplan-app`
3. Key: cole a chave pública copiada
4. **Não marque "Allow write access"** — só leitura é suficiente pra clonar/atualizar
5. Add key

**Clonar:**
```bash
GIT_SSH_COMMAND="ssh -i ~/.ssh/diplan_deploy_key" git clone git@github.com:SamLuor/DiPlan.git app
cd app
cp .env.production.example .env.production
nano .env.production   # preencher POSTGRES_PASSWORD, SESSION_SECRET, APP_URL (http://SEU_IP), RESEND_API_KEY, RESEND_FROM, S3_BUCKET_NAME
```

Pra não precisar repetir `GIT_SSH_COMMAND=...` em todo `git pull` futuro, configure isso uma vez dentro do repo já clonado:
```bash
git config core.sshCommand "ssh -i ~/.ssh/diplan_deploy_key"
```

### 4. Subir a aplicação

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml logs -f app   # acompanhar o build/start, Ctrl+C pra sair do log (não derruba o container)
```

O `pnpm run start` (dentro do container `app`) já roda `drizzle-kit migrate` antes de subir o servidor — schema aplicado automaticamente no primeiro boot e em todo restart.

### 5. Seed do usuário admin (uma vez, após o primeiro deploy)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app \
  env HOMOLOG_ADMIN_EMAIL=email-do-admin@dominio.com pnpm db:seed:homolog:prod
```

Cria 1 eixo ("Administração") + 1 usuário (chefia, modo convite) e dispara o e-mail real de definição de senha. Sem `RESEND_API_KEY` configurada, o link cai no log (`docker compose -f docker-compose.prod.yml logs app`).

## Verificação após o deploy

- `curl -I http://SEU_IP` (ou abrir no navegador) → tela de login, sem 502/500.
- `docker compose -f docker-compose.prod.yml ps` → os dois serviços `Up`/`healthy`.
- Rodar o seed (passo 5), abrir o link de definição de senha, logar.
- `docker compose -f docker-compose.prod.yml exec postgres pg_isready` → confirma o banco de pé.
- Abrir uma entrega e testar upload de anexo de verdade — se der erro de credenciais, é o hop limit do IMDS (passo 1.5) que provavelmente ficou em 1.

## Rotina de manutenção

- **Deploy de uma atualização de código**: `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.
- **Backup do banco**: `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U gestao_entregas gestao_entregas > backup-$(date +%F).sql` — não tem backup automático como o RDS teria; rodar isso manualmente (ou agendar via cron) é sua responsabilidade nessa arquitetura.
- **Logs**: `docker compose -f docker-compose.prod.yml logs -f app` / `logs -f postgres`.

## HTTPS com domínio próprio (quando tiver um)

Fora do escopo deste primeiro deploy (homologação, acesso só por IP). Quando a cliente tiver um domínio, o caminho mais simples é colocar um Caddy na frente do `app` (Caddy tira certificado Let's Encrypt sozinho, só precisa apontar o domínio pro IP elástico) — revisitar como uma etapa separada quando isso for necessário, não antes.

**Nota de segurança enquanto for só HTTP (acesso por IP)**: o cookie de sessão só fica marcado `Secure` quando `APP_URL` começa com `https://` (ver `session.server.ts`) — com `http://SEU_IP`, o login funciona, mas o cookie de sessão trafega sem criptografia. Aceitável pra homologação/demo em rede que você controla; não deve ser usado como configuração final pra dados reais da cliente sem migrar pra HTTPS.
