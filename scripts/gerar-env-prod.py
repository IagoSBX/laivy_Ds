#!/usr/bin/env python3
"""
Cria o .env.prod do servidor a partir do .env.prod.example, preenchendo os
segredos (senhas do MySQL, JWT_SECRET, N8N_TOKEN, N8N_ENCRYPTION_KEY) com
valores aleatórios novos. Nada é impresso na tela e um .env.prod existente
nunca é sobrescrito (os dados do servidor dependem dessas senhas).

    python3 scripts/gerar-env-prod.py
    # depois edite DOMINIO, EMAIL_CERTIFICADO e SMTP_* no .env.prod
"""
import os
import re
import secrets
import string
import sys

MODELO, DESTINO = ".env.prod.example", ".env.prod"
ALFA = string.ascii_letters + string.digits


def senha(n):
    return "".join(secrets.choice(ALFA) for _ in range(n))


SEGREDOS = {
    "DB_PASSWORD": lambda: senha(32),
    "DB_APP_PASSWORD": lambda: senha(32),
    "JWT_SECRET": lambda: secrets.token_urlsafe(64),
    "N8N_TOKEN": lambda: secrets.token_urlsafe(32),
    "N8N_ENCRYPTION_KEY": lambda: secrets.token_urlsafe(32),
}


def preencher(texto):
    for chave, gerar in SEGREDOS.items():
        texto, n = re.subn(rf"^{chave}=.*$", lambda m, c=chave, g=gerar: f"{c}={g()}", texto, flags=re.M)
        assert n == 1, f"{chave} não encontrado no modelo"
    return texto


if __name__ == "__main__":
    if os.path.exists(DESTINO):
        sys.exit(f"{DESTINO} já existe — não vou sobrescrever (as senhas do banco dependem dele).")
    texto = preencher(open(MODELO).read())
    fd = os.open(DESTINO, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)  # só o dono lê
    with os.fdopen(fd, "w") as f:
        f.write(texto)
    print(f"{DESTINO} criado com segredos novos. Agora edite DOMINIO, EMAIL_CERTIFICADO e SMTP_*.")
