-- Número e complemento do endereço do usuário (antes ficavam misturados no campo endereco_usuario).
ALTER TABLE tbl_usuario
  ADD COLUMN numero_usuario      VARCHAR(10) NULL AFTER endereco_usuario,
  ADD COLUMN complemento_usuario VARCHAR(60) NULL AFTER numero_usuario;
