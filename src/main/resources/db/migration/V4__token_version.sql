-- Versão do token de sessão: incrementada no logout e na troca de senha.
-- Tokens JWT emitidos com uma versão antiga deixam de valer (JwtFilter).
ALTER TABLE tbl_usuario ADD COLUMN token_version INT NOT NULL DEFAULT 0;
