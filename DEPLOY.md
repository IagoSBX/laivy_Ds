# Subindo o LAIVY num servidor

Tudo roda em Docker: um proxy **Caddy** (HTTPS automático com Let's Encrypt) na
frente do **backend** (Spring Boot + frontend React), mais **MySQL**, **n8n**
(assistente de IA) e **Qdrant** (base de conhecimento da IA). Só o Caddy fica
exposto na internet; o resto conversa pela rede interna do Docker.

## 1. O que você precisa

- Um servidor Linux (VPS) com **2 vCPU e 4 GB de RAM** no mínimo (Ubuntu 24.04
  funciona bem), com acesso SSH.
- Um **domínio** (ou subdomínio) com registro **A** apontando para o IP do
  servidor — o certificado HTTPS só é emitido depois que o DNS propagar.
- Uma conta de **SMTP** para enviar e-mails (ex.: Brevo).
- Uma **chave da OpenAI** para o assistente de IA.

## 2. Preparar o servidor (uma vez)

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # saia e entre de novo no SSH

# Firewall: só SSH e web
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

> O Docker publica portas por fora do `ufw`. Por isso o `docker-compose.prod.yml`
> só publica 80/443 (Caddy) e o editor do n8n em `127.0.0.1` — nada mais fica
> acessível de fora.

## 3. Código e segredos

```bash
git clone https://github.com/IagoSBX/laivy.git
cd laivy
git switch <branch-de-producao>

python3 scripts/gerar-env-prod.py   # cria .env.prod com senhas/tokens aleatórios novos
nano .env.prod                      # preencha DOMINIO, EMAIL_CERTIFICADO e SMTP_*
```

- **Nunca** reaproveite segredos do ambiente de desenvolvimento nem de um
  `.env` que já esteve no git: o script gera tudo novo.
- Guarde uma cópia do `.env.prod` fora do servidor (gerenciador de senhas). Sem
  ele não dá para restaurar os backups (as senhas do banco e a
  `N8N_ENCRYPTION_KEY` que cifra as credenciais do n8n estão nele).

## 4. Subir

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Na primeira subida o banco é criado com os dados iniciais. As contas padrão
(`admin`, `treinador`, `atleta`) têm a senha trocada automaticamente por uma
**senha temporária**, que só aparece no log:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs backend | grep "Senha padrao"
```

Entre em `https://SEU_DOMINIO/login.html` com `admin` e essa senha — o sistema
obriga a criar uma senha nova no primeiro acesso. Faça o mesmo (ou exclua) as
contas `treinador` e `atleta` de exemplo.

## 5. Configurar o assistente de IA (n8n)

O editor do n8n **não** fica na internet. Acesse por um túnel SSH, a partir do
seu computador:

```bash
ssh -L 5679:127.0.0.1:5678 usuario@SEU_SERVIDOR
# e abra http://localhost:5679 no navegador
# (porta 5679 no seu computador para não cair no n8n local, que usa a 5678;
#  o sinal de que está no servidor certo é a tela de criar conta no 1º acesso)
```

1. Crie a conta de dono do n8n (primeiro acesso) com uma senha forte.
2. Importe e publique o workflow do repositório, no servidor:

   ```bash
   C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
   $C cp n8n/workflows/laivy-chat.json n8n:/home/node/laivy-chat.json
   $C exec n8n n8n import:workflow --input=/home/node/laivy-chat.json
   $C exec n8n n8n publish:workflow --id=9ahyddVsBWDzoYmv
   $C restart n8n
   ```

3. No editor, crie as credenciais **OpenAI** (sua chave) e **Qdrant**
   (URL `http://qdrant:6333`, sem chave) e selecione-as nos nós do workflow
   "LAIVY - Chat" que mostrarem alerta de credencial. Salve e publique.
4. Para a base de conhecimento (perguntas sobre o sistema), carregue o PDF de
   documentação no Qdrant uma vez:

   ```bash
   $C exec n8n mkdir -p /home/node/.n8n-files
   $C cp LAIVY_Documentacao_Completa_v2.pdf n8n:/home/node/.n8n-files/
   $C cp n8n/workflows/laivy-pdf.json n8n:/home/node/laivy-pdf.json
   $C exec n8n n8n import:workflow --input=/home/node/laivy-pdf.json
   ```

   No editor, abra "LAIVY-PDF", selecione as credenciais OpenAI e Qdrant e
   clique em "Execute workflow" (cria a coleção `laivy.pdf`).

O workflow só aceita chamadas com o `X-Token` igual ao `N8N_TOKEN` do
`.env.prod` (o backend envia sozinho) e responde 401 a qualquer outra.

## 6. Backups

```bash
./scripts/backup.sh            # gera backups/mysql_*.sql.gz e backups/n8n_*.tar.gz
crontab -e                     # todo dia às 3h:
# 0 3 * * * cd /caminho/do/laivy && ./scripts/backup.sh >> backups/backup.log 2>&1
```

O script guarda 14 dias. Copie a pasta `backups/` para fora do servidor
(outro disco, bucket, etc.) — backup no mesmo disco não protege de perda do servidor.

Restaurar o banco:

```bash
gunzip -c backups/mysql_AAAA-MM-DD_HHMM.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T mysql \
  sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE"'
```

## 7. Atualizar para uma versão nova

```bash
./scripts/backup.sh
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

As migrations do banco (Flyway) rodam sozinhas na subida.

## O que já vem protegido

- HTTPS obrigatório (HTTP redireciona), HSTS e certificado renovado sozinho.
- Cabeçalhos de segurança e Content-Security-Policy restritiva (só scripts do
  próprio site) no `deploy/Caddyfile`.
- Sessão em cookie `HttpOnly` + `Secure` + `SameSite=Strict`; logout e troca de
  senha invalidam todas as sessões; senha temporária obriga troca.
- Senhas em BCrypt; login com o mesmo tempo de resposta exista o usuário ou
  não; bloqueio de 15 min após 5 erros no mesmo login a partir do mesmo IP e
  após 20 erros de um mesmo IP em qualquer login.
- Banco acessado por um usuário próprio (não root); MySQL, n8n e Qdrant fora da
  internet; logs dos containers com tamanho limitado.
