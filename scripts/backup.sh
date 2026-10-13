#!/bin/sh
# Backup do LAIVY em produção: banco MySQL + dados do n8n (workflows e
# credenciais cifradas pela N8N_ENCRYPTION_KEY do .env.prod).
# Rode na raiz do projeto; agende no cron (ver DEPLOY.md). Guarda 14 dias.
set -eu
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
DESTINO="${1:-backups}"
DATA=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DESTINO"
chmod 700 "$DESTINO"

# senha lida dentro do container (não passa pela linha de comando do host)
$COMPOSE exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines "$MYSQL_DATABASE"' \
  | gzip > "$DESTINO/mysql_$DATA.sql.gz"
$COMPOSE exec -T n8n tar czf - -C /home/node/.n8n . > "$DESTINO/n8n_$DATA.tar.gz"

find "$DESTINO" -name '*.gz' -mtime +14 -delete
echo "Backup em $DESTINO: mysql_$DATA.sql.gz e n8n_$DATA.tar.gz"
