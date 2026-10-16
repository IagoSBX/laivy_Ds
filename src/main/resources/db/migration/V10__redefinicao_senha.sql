-- "Esqueci minha senha": guarda só o hash (SHA-256) do token enviado por
-- e-mail e até quando ele vale. O token em si nunca fica no banco.
ALTER TABLE tbl_usuario
  ADD COLUMN reset_senha_hash   VARCHAR(64) DEFAULT NULL,
  ADD COLUMN reset_senha_expira DATETIME(3) DEFAULT NULL,
  ADD KEY idx_usuario_reset_senha (reset_senha_hash);
