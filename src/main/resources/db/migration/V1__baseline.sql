-- =====================================================================
-- Baseline do schema — captura o estado atual do banco de desenvolvimento
-- (criado originalmente via Hibernate ddl-auto=update) para que o Flyway
-- passe a ser dono do schema a partir daqui.
--
-- tbl_time e tbl_usuario têm referência circular (time -> treinador,
-- usuário -> time), então tbl_time nasce sem a FK do treinador e ela é
-- adicionada depois que tbl_usuario existe.
-- =====================================================================

CREATE TABLE tbl_time (
  id_time          INT NOT NULL AUTO_INCREMENT,
  nome_time        VARCHAR(100) NOT NULL,
  modalidade_time  VARCHAR(60)  DEFAULT NULL,
  categoria_time   VARCHAR(60)  DEFAULT NULL,
  cor_time         VARCHAR(20)  DEFAULT '#00C97A',
  descricao_time   TEXT,
  ativo_time       INT DEFAULT NULL,
  logo_time        MEDIUMTEXT,
  id_treinador     INT DEFAULT NULL,
  PRIMARY KEY (id_time),
  KEY idx_time_ativo (ativo_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_usuario (
  id_usuario         INT NOT NULL AUTO_INCREMENT,
  nome_usuario       VARCHAR(255) DEFAULT NULL,
  email_usuario      VARCHAR(255) DEFAULT NULL,
  login_usuario      VARCHAR(255) DEFAULT NULL,
  senha_usuario      VARCHAR(255) DEFAULT NULL,
  tipo_usuario       INT NOT NULL,
  data_nasc_usuario  DATE DEFAULT NULL,
  foto_usuario       MEDIUMTEXT COMMENT 'Foto do usuário em Base64',
  endereco_usuario   VARCHAR(255) DEFAULT NULL,
  bairro_usuario     VARCHAR(255) DEFAULT NULL,
  cep_usuario        VARCHAR(255) DEFAULT NULL,
  cidade_usuario     VARCHAR(255) DEFAULT NULL,
  estado_usuario     VARCHAR(255) DEFAULT NULL,
  cel_usuario        VARCHAR(255) DEFAULT NULL,
  rg_responsavel_1   VARCHAR(255) DEFAULT NULL,
  rg_responsavel_2   VARCHAR(255) DEFAULT NULL,
  cpf_responsavel_1  VARCHAR(255) DEFAULT NULL,
  cpf_responsavel_2  VARCHAR(255) DEFAULT NULL,
  cel_responsavel_1  VARCHAR(255) DEFAULT NULL,
  cel_responsavel_2  VARCHAR(255) DEFAULT NULL,
  cpf_usuario        VARCHAR(255) DEFAULT NULL,
  primeiro_login     INT DEFAULT NULL,
  id_time            INT DEFAULT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY login_usuario (login_usuario),
  UNIQUE KEY email_usuario (email_usuario),
  KEY fk_usuario_time (id_time),
  CONSTRAINT fk_usuario_time FOREIGN KEY (id_time) REFERENCES tbl_time (id_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE tbl_time
  ADD CONSTRAINT fk_time_treinador FOREIGN KEY (id_treinador) REFERENCES tbl_usuario (id_usuario) ON DELETE SET NULL;

CREATE TABLE tbl_atividade (
  id_atividade      INT NOT NULL AUTO_INCREMENT,
  id_usuario        INT NOT NULL,
  nome_atividade    VARCHAR(255) DEFAULT NULL,
  lugar_atividade   VARCHAR(255) DEFAULT NULL,
  data_atividade    DATETIME DEFAULT NULL,
  status_atividade  INT DEFAULT NULL,
  tipo_atividade    INT DEFAULT NULL,
  time_oponente     VARCHAR(100) DEFAULT NULL,
  placar_pro        INT DEFAULT NULL,
  placar_contra     INT DEFAULT NULL,
  id_time           INT DEFAULT NULL,
  fim_recorrencia   DATE DEFAULT NULL,
  recorrente        BIT(1) DEFAULT NULL,
  PRIMARY KEY (id_atividade),
  KEY fk_atividade_usuario (id_usuario),
  KEY fk_atividade_time (id_time),
  CONSTRAINT fk_atividade_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_atividade_time FOREIGN KEY (id_time) REFERENCES tbl_time (id_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_calendario (
  id_calendario  INT NOT NULL AUTO_INCREMENT,
  id_usuario     INT NOT NULL,
  id_atividade   INT NOT NULL,
  observacoes    VARCHAR(255) DEFAULT NULL,
  placar_pro     INT DEFAULT NULL,
  placar_contra  INT DEFAULT NULL,
  PRIMARY KEY (id_calendario),
  KEY fk_calendario_usuario (id_usuario),
  KEY fk_calendario_atividade (id_atividade),
  CONSTRAINT fk_calendario_atividade FOREIGN KEY (id_atividade) REFERENCES tbl_atividade (id_atividade) ON DELETE CASCADE,
  CONSTRAINT fk_calendario_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_desempenho (
  id_desempenho     INT NOT NULL AUTO_INCREMENT,
  id_usuario        INT NOT NULL,
  posicao_usuario   INT DEFAULT NULL,
  data_desempenho   DATE DEFAULT NULL,
  salto_horizontal  DOUBLE DEFAULT NULL,
  salto_vertical    DOUBLE DEFAULT NULL,
  pontuacao         INT DEFAULT NULL,
  PRIMARY KEY (id_desempenho),
  KEY fk_desempenho_usuario (id_usuario),
  CONSTRAINT fk_desempenho_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_escalacao (
  id_escalacao   INT NOT NULL AUTO_INCREMENT,
  id_atividade   INT NOT NULL,
  id_usuario     INT NOT NULL,
  numero_camisa  INT DEFAULT NULL,
  posicao        VARCHAR(50) DEFAULT NULL,
  titular        INT DEFAULT NULL,
  pontos_jogo    INT DEFAULT NULL,
  PRIMARY KEY (id_escalacao),
  KEY fk_esc_atividade (id_atividade),
  KEY fk_esc_usuario (id_usuario),
  CONSTRAINT fk_esc_atividade FOREIGN KEY (id_atividade) REFERENCES tbl_atividade (id_atividade) ON DELETE CASCADE,
  CONSTRAINT fk_esc_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_exame (
  id_exame            INT NOT NULL AUTO_INCREMENT,
  id_usuario          INT NOT NULL,
  data_inicio_exame   DATE DEFAULT NULL,
  data_fim_exame      DATE DEFAULT NULL,
  observacoes_exame   VARCHAR(255) DEFAULT NULL,
  altura_usuario      DOUBLE DEFAULT NULL,
  peso_usuario        DOUBLE DEFAULT NULL,
  taxa_gordura_usuario DOUBLE DEFAULT NULL,
  status_usuario      INT DEFAULT NULL,
  foto_exame          VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_exame),
  KEY fk_exame_usuario (id_usuario),
  CONSTRAINT fk_exame_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tbl_visitante (
  id_visitante        INT NOT NULL AUTO_INCREMENT,
  id_calendario       INT NOT NULL,
  nome_visitante      VARCHAR(255) DEFAULT NULL,
  municipio_visitante VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_visitante),
  KEY fk_visitante_calendario (id_calendario),
  CONSTRAINT fk_visitante_calendario FOREIGN KEY (id_calendario) REFERENCES tbl_calendario (id_calendario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
