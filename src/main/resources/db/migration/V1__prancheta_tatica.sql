-- =====================================================================
-- Prancheta Tática Digital — schema inicial
--
-- Ajustado para as convenções reais do LAIVY:
--   - tbl_time(id_time), tbl_usuario(id_usuario), tbl_atividade(id_atividade)
--   - todas as PKs do projeto são INT AUTO_INCREMENT (não BIGINT/UUID)
-- =====================================================================

CREATE TABLE jogada (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  id_time        INT          NOT NULL,
  id_criador     INT          NOT NULL,
  nome           VARCHAR(120) NOT NULL,
  conteudo       JSON         NOT NULL,
  versao         BIGINT       NOT NULL DEFAULT 0,
  criado_em      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  arquivada_em   DATETIME(3)  NULL,

  -- Colunas geradas: o MySQL calcula, então nunca saem de sincronia com
  -- o JSON. Permitem indexar o filtro da biblioteca sem ler o conteúdo.
  tipo       VARCHAR(20) AS (conteudo ->> '$.tipo')             STORED,
  qtd_frames INT         AS (JSON_LENGTH(conteudo, '$.frames')) STORED,
  schema_ver INT         AS (conteudo ->> '$.schemaVersion')    STORED,

  KEY idx_biblioteca (id_time, tipo, atualizado_em),
  KEY idx_schema (schema_ver),
  KEY idx_nome (id_time, nome),
  CONSTRAINT fk_jogada_time    FOREIGN KEY (id_time)    REFERENCES tbl_time(id_time),
  CONSTRAINT fk_jogada_criador FOREIGN KEY (id_criador) REFERENCES tbl_usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Vínculo N:N. É o que permite a mesma jogada servir ao treino de terça
-- e ao jogo de sábado, que é o ponto central da proposta.
CREATE TABLE atividade_jogada (
  id_atividade INT NOT NULL,
  id_jogada    INT NOT NULL,
  ordem        INT NOT NULL DEFAULT 0,
  observacoes  TEXT NULL,
  criado_em    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id_atividade, id_jogada),
  KEY idx_por_jogada (id_jogada),
  CONSTRAINT fk_aj_atividade FOREIGN KEY (id_atividade)
      REFERENCES tbl_atividade(id_atividade) ON DELETE CASCADE,
  CONSTRAINT fk_aj_jogada FOREIGN KEY (id_jogada)
      REFERENCES jogada(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Confirmação de leitura do atleta. O treinador acompanha quem já viu.
CREATE TABLE jogada_visualizacao (
  id_jogada      INT NOT NULL,
  id_atividade   INT NOT NULL,
  id_usuario     INT NOT NULL,
  visualizada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id_jogada, id_atividade, id_usuario),
  KEY idx_por_atividade (id_atividade, id_usuario),
  CONSTRAINT fk_jv_jogada FOREIGN KEY (id_jogada)
      REFERENCES jogada(id) ON DELETE CASCADE,
  CONSTRAINT fk_jv_atividade FOREIGN KEY (id_atividade)
      REFERENCES tbl_atividade(id_atividade) ON DELETE CASCADE,
  CONSTRAINT fk_jv_usuario FOREIGN KEY (id_usuario)
      REFERENCES tbl_usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
