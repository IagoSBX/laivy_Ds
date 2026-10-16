-- =====================================================================
-- Autocadastro de treinador, planos pagos via PIX, período de teste,
-- convite de atletas/preparadores por e-mail e perfil Preparador Físico
-- (tipo_usuario = 4).
-- =====================================================================

-- autocadastro      1 = treinador que se cadastrou sozinho (paga plano); 0 = criado por Admin/Treinador
-- email_confirmado  0 até clicar no link do e-mail de confirmação (contas antigas já valem como confirmadas)
-- confirmacao_*     hash SHA-256 do token do link de confirmação e validade
-- cadastro_completo 0 = convidado por e-mail que ainda não preencheu os dados pessoais
-- teste_*           período de teste (7 dias, só visualização) — uma vez por conta
ALTER TABLE tbl_usuario
  ADD COLUMN autocadastro       INT NOT NULL DEFAULT 0,
  ADD COLUMN email_confirmado   INT NOT NULL DEFAULT 1,
  ADD COLUMN confirmacao_hash   VARCHAR(64) DEFAULT NULL,
  ADD COLUMN confirmacao_expira DATETIME(3) DEFAULT NULL,
  ADD COLUMN cadastro_completo  INT NOT NULL DEFAULT 1,
  ADD COLUMN teste_inicio       DATETIME(3) DEFAULT NULL,
  ADD COLUMN teste_fim          DATETIME(3) DEFAULT NULL,
  ADD KEY idx_usuario_confirmacao (confirmacao_hash);

-- Time de demonstração mostrado (somente leitura) a quem está no período de teste.
ALTER TABLE tbl_time ADD COLUMN demo_time INT NOT NULL DEFAULT 0;

-- Cada cobrança PIX de um plano. Valor em centavos. valida_ate = fim do mês pago.
CREATE TABLE tbl_assinatura (
  id_assinatura   INT NOT NULL AUTO_INCREMENT,
  id_usuario      INT NOT NULL,
  plano           VARCHAR(10) NOT NULL,
  valor_centavos  INT NOT NULL,
  status          VARCHAR(12) NOT NULL,
  id_pagamento    VARCHAR(40) DEFAULT NULL,
  pix_copia_cola  VARCHAR(1000) DEFAULT NULL,
  pix_qr_base64   MEDIUMTEXT,
  pix_expira      DATETIME(3) DEFAULT NULL,
  criada_em       DATETIME(3) NOT NULL,
  paga_em         DATETIME(3) DEFAULT NULL,
  valida_ate      DATETIME(3) DEFAULT NULL,
  PRIMARY KEY (id_assinatura),
  KEY idx_assinatura_usuario (id_usuario, status),
  UNIQUE KEY uk_assinatura_pagamento (id_pagamento),
  CONSTRAINT fk_assinatura_usuario FOREIGN KEY (id_usuario) REFERENCES tbl_usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── Time de demonstração ─────────────────────────────────────────────
-- Pessoas fictícias. A senha é o hash de um valor aleatório descartado:
-- ninguém entra com essas contas.
SET @senha_demo := '$2a$12$R53oDn5RGKeh92bHzc591er4/y0gzSaOUHGdez3wGxNCj7IfPwYR2';

INSERT INTO tbl_usuario (nome_usuario, email_usuario, login_usuario, senha_usuario, tipo_usuario, primeiro_login, cidade_usuario, estado_usuario)
VALUES ('Carlos Demonstração', 'treinador@demo.laivy.local', 'demo.treinador', @senha_demo, 2, 0, 'São Paulo', 'SP');
SET @treinador_demo := LAST_INSERT_ID();

INSERT INTO tbl_time (nome_time, modalidade_time, categoria_time, cor_time, descricao_time, ativo_time, id_treinador, demo_time)
VALUES ('LAIVY Demo', 'Basquete', 'Sub-17', '#00C97A', 'Time de demonstração com dados fictícios para conhecer a plataforma.', 1, @treinador_demo, 1);
SET @time_demo := LAST_INSERT_ID();
UPDATE tbl_usuario SET id_time = @time_demo WHERE id_usuario = @treinador_demo;

INSERT INTO tbl_usuario (nome_usuario, email_usuario, login_usuario, senha_usuario, tipo_usuario, primeiro_login, id_time, data_nasc_usuario, cidade_usuario, estado_usuario)
VALUES
  ('Lucas Andrade',    'atleta1@demo.laivy.local', 'demo.atleta1', @senha_demo, 3, 0, @time_demo, '2009-03-14', 'São Paulo', 'SP'),
  ('Pedro Rocha',      'atleta2@demo.laivy.local', 'demo.atleta2', @senha_demo, 3, 0, @time_demo, '2009-07-02', 'São Paulo', 'SP'),
  ('Gabriel Martins',  'atleta3@demo.laivy.local', 'demo.atleta3', @senha_demo, 3, 0, @time_demo, '2008-11-21', 'Osasco', 'SP'),
  ('Rafael Souza',     'atleta4@demo.laivy.local', 'demo.atleta4', @senha_demo, 3, 0, @time_demo, '2009-01-30', 'Guarulhos', 'SP'),
  ('Matheus Lima',     'atleta5@demo.laivy.local', 'demo.atleta5', @senha_demo, 3, 0, @time_demo, '2008-09-09', 'São Paulo', 'SP'),
  ('João Vitor Alves', 'atleta6@demo.laivy.local', 'demo.atleta6', @senha_demo, 3, 0, @time_demo, '2009-05-17', 'Santo André', 'SP'),
  ('Enzo Carvalho',    'atleta7@demo.laivy.local', 'demo.atleta7', @senha_demo, 3, 0, @time_demo, '2008-12-03', 'São Paulo', 'SP'),
  ('Thiago Ribeiro',   'atleta8@demo.laivy.local', 'demo.atleta8', @senha_demo, 3, 0, @time_demo, '2009-08-25', 'Barueri', 'SP');

-- Treinos e jogos em volta da data em que a migração rodar
INSERT INTO tbl_atividade (id_usuario, nome_atividade, lugar_atividade, data_atividade, status_atividade, tipo_atividade, time_oponente, placar_pro, placar_contra, id_time, recorrente)
VALUES
  (@treinador_demo, 'Treino de arremesso',   'Ginásio Municipal', DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 18 HOUR, 1, 1, NULL, NULL, NULL, @time_demo, b'0'),
  (@treinador_demo, 'Treino tático',         'Ginásio Municipal', DATE_ADD(CURDATE(), INTERVAL 3 DAY) + INTERVAL 18 HOUR, 1, 1, NULL, NULL, NULL, @time_demo, b'0'),
  (@treinador_demo, 'Amistoso',              'Arena Leste',       DATE_ADD(CURDATE(), INTERVAL 6 DAY) + INTERVAL 10 HOUR, 1, 2, 'Leões do Norte', NULL, NULL, @time_demo, b'0'),
  (@treinador_demo, 'Campeonato Regional',   'Ginásio Municipal', DATE_SUB(CURDATE(), INTERVAL 5 DAY) + INTERVAL 10 HOUR, 2, 2, 'Águias FC', 78, 64, @time_demo, b'0'),
  (@treinador_demo, 'Treino físico',         'Academia do clube', DATE_SUB(CURDATE(), INTERVAL 2 DAY) + INTERVAL 18 HOUR, 2, 1, NULL, NULL, NULL, @time_demo, b'0');

-- Avaliações de desempenho e exames de cada atleta do time demo
INSERT INTO tbl_desempenho (id_usuario, posicao_usuario, data_desempenho, salto_horizontal, salto_vertical, pontuacao)
SELECT u.id_usuario, 1 + (u.id_usuario % 5), DATE_SUB(CURDATE(), INTERVAL 30 DAY),
       2.10 + (u.id_usuario % 7) * 0.05, 0.48 + (u.id_usuario % 5) * 0.03, 8 + (u.id_usuario % 9)
  FROM tbl_usuario u WHERE u.id_time = @time_demo AND u.tipo_usuario = 3;
INSERT INTO tbl_desempenho (id_usuario, posicao_usuario, data_desempenho, salto_horizontal, salto_vertical, pontuacao)
SELECT u.id_usuario, 1 + (u.id_usuario % 5), DATE_SUB(CURDATE(), INTERVAL 5 DAY),
       2.20 + (u.id_usuario % 7) * 0.05, 0.52 + (u.id_usuario % 5) * 0.03, 11 + (u.id_usuario % 11)
  FROM tbl_usuario u WHERE u.id_time = @time_demo AND u.tipo_usuario = 3;

INSERT INTO tbl_exame (id_usuario, data_inicio_exame, data_fim_exame, observacoes_exame, altura_usuario, peso_usuario, taxa_gordura_usuario, status_usuario)
SELECT u.id_usuario, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 20 DAY), 'Avaliação física de início de temporada',
       1.72 + (u.id_usuario % 8) * 0.03, 62 + (u.id_usuario % 9) * 2, 11 + (u.id_usuario % 6), 1
  FROM tbl_usuario u WHERE u.id_time = @time_demo AND u.tipo_usuario = 3;
