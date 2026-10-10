-- Preserva o cadastro mais recente quando jÃ¡ hÃ¡ registros repetidos.
UPDATE tbl_usuario u
JOIN tbl_usuario mais_novo
  ON REGEXP_REPLACE(mais_novo.cpf_usuario, '[^0-9]', '') = REGEXP_REPLACE(u.cpf_usuario, '[^0-9]', '')
 AND mais_novo.id_usuario > u.id_usuario
SET u.cpf_usuario = NULL
WHERE u.cpf_usuario IS NOT NULL AND u.cpf_usuario <> '';

UPDATE tbl_usuario SET cpf_usuario = REGEXP_REPLACE(cpf_usuario, '[^0-9]', '')
WHERE cpf_usuario IS NOT NULL AND cpf_usuario <> '';
UPDATE tbl_usuario SET cpf_usuario = NULL
WHERE cpf_usuario IS NOT NULL AND REGEXP_REPLACE(cpf_usuario, '[^0-9]', '') = '';
CREATE UNIQUE INDEX uk_tbl_usuario_cpf ON tbl_usuario(cpf_usuario);

-- Linha de sincronização por CPF: serializa cadastros concorrentes do mesmo documento.
CREATE TABLE tbl_cpf_lock (
  cpf VARCHAR(20) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Nas escalaÃ§Ãµes existentes, conserva camisa e posiÃ§Ã£o do registro mais recente.
UPDATE tbl_escalacao e
JOIN tbl_escalacao novo ON novo.id_atividade = e.id_atividade
 AND novo.numero_camisa = e.numero_camisa AND novo.id_escalacao > e.id_escalacao
SET e.numero_camisa = NULL
WHERE e.numero_camisa IS NOT NULL;
UPDATE tbl_escalacao e
JOIN tbl_escalacao novo ON novo.id_atividade = e.id_atividade
 AND novo.titular = 1 AND e.titular = 1
 AND LOWER(novo.posicao) = LOWER(e.posicao) AND novo.id_escalacao > e.id_escalacao
SET e.posicao = NULL
WHERE e.posicao IS NOT NULL AND e.posicao <> '';
UPDATE tbl_escalacao SET posicao = NULL WHERE posicao IS NOT NULL AND TRIM(posicao) = '';
CREATE UNIQUE INDEX uk_escalacao_atividade_camisa ON tbl_escalacao(id_atividade, numero_camisa);
