-- Log de atividades (auditoria): quem fez o quê, em qual item, de onde.
-- Sem chave estrangeira para tbl_usuario de propósito: o registro precisa
-- continuar legível depois que o usuário é excluído (por isso o nome e o
-- perfil ficam copiados aqui). Nunca guarda o corpo das requisições.
CREATE TABLE tbl_log_auditoria (
  id_log        BIGINT       NOT NULL AUTO_INCREMENT,
  data_hora     DATETIME(3)  NOT NULL,
  id_usuario    INT          DEFAULT NULL,
  nome_usuario  VARCHAR(255) DEFAULT NULL,
  tipo_usuario  INT          DEFAULT NULL,
  id_time       INT          DEFAULT NULL,
  acao          VARCHAR(30)  NOT NULL COMMENT 'CRIAR, EDITAR, EXCLUIR, LOGIN, LOGIN_FALHA, LOGIN_BLOQUEADO, LOGOUT, SENHA, ACESSO_NEGADO, IA',
  descricao     VARCHAR(255) NOT NULL,
  recurso       VARCHAR(40)  DEFAULT NULL,
  id_recurso    INT          DEFAULT NULL,
  detalhe       VARCHAR(255) DEFAULT NULL,
  metodo        VARCHAR(8)   DEFAULT NULL,
  caminho       VARCHAR(255) DEFAULT NULL,
  status_http   INT          DEFAULT NULL,
  sucesso       BIT(1)       NOT NULL,
  ip            VARCHAR(45)  DEFAULT NULL,
  PRIMARY KEY (id_log),
  KEY idx_log_data (data_hora),
  KEY idx_log_usuario (id_usuario, data_hora),
  KEY idx_log_acao (acao, data_hora),
  KEY idx_log_time (id_time, data_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
