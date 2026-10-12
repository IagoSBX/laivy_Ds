#!/usr/bin/env python3
"""
Gera segredos novos e fortes para o .env do LAIVY e cria o usuário 'laivy'
do MySQL (a aplicação deixa de usar root). Nada é impresso na tela.

Rode na raiz do projeto, com o docker compose no ar:
    python3 scripts/rotacionar-segredos.py
    docker compose up -d --force-recreate backend n8n

Efeitos:
  - DB_PASSWORD (root do MySQL), DB_APP_USER/DB_APP_PASSWORD, JWT_SECRET e
    N8N_TOKEN recebem valores novos (todos os usuários precisam logar de novo).
  - Backup do .env anterior em .env.bak (ignorado pelo git).
"""
import re
import secrets
import shutil
import string
import subprocess

ENV = ".env"
ALFA = string.ascii_letters + string.digits


def novo(n):
    return "".join(secrets.choice(ALFA) for _ in range(n))


txt = open(ENV).read()
env = dict(l.split("=", 1) for l in txt.splitlines() if "=" in l and not l.lstrip().startswith("#"))

novos = {
    "DB_PASSWORD": novo(32),
    "DB_APP_USER": "laivy",
    "DB_APP_PASSWORD": novo(32),
    "JWT_SECRET": secrets.token_urlsafe(64),
    "N8N_TOKEN": secrets.token_urlsafe(32),
}

sql = (
    f"CREATE USER IF NOT EXISTS 'laivy'@'%' IDENTIFIED BY '{novos['DB_APP_PASSWORD']}';"
    f"ALTER USER 'laivy'@'%' IDENTIFIED BY '{novos['DB_APP_PASSWORD']}';"
    "GRANT ALL PRIVILEGES ON sistema_esportivo.* TO 'laivy'@'%';"
    f"ALTER USER 'root'@'%' IDENTIFIED BY '{novos['DB_PASSWORD']}';"
    f"ALTER USER 'root'@'localhost' IDENTIFIED BY '{novos['DB_PASSWORD']}';"
    "FLUSH PRIVILEGES;"
)
r = subprocess.run(
    ["docker", "exec", "-i", "-e", "MYSQL_PWD=" + env["DB_PASSWORD"], "laivy-mysql", "mysql", "-uroot"],
    input=sql, text=True, capture_output=True,
)
if r.returncode != 0:
    raise SystemExit("Erro no MySQL (nada foi alterado no .env): " + r.stderr.strip())

shutil.copy(ENV, ENV + ".bak")
for k, v in novos.items():
    if re.search(rf"^{k}=.*$", txt, flags=re.M):
        txt = re.sub(rf"^{k}=.*$", lambda m: f"{k}={v}", txt, flags=re.M)
    else:
        txt = txt.rstrip("\n") + f"\n{k}={v}\n"
open(ENV, "w").write(txt)
print("Pronto: segredos novos no .env (backup em .env.bak). Agora rode:")
print("  docker compose up -d --force-recreate backend n8n")
