-- =====================================================================
-- Usuários padrão para um banco recém-criado (README "Credenciais
-- padrão"). Senhas em BCrypt (custo 12), mesmo formato que
-- UsuarioService gera em tempo de execução.
--   admin / admin       (tipo_usuario = 1, Admin)
--   treinador / 1234    (tipo_usuario = 2, Treinador)
--   atleta / 1234       (tipo_usuario = 3, Atleta)
-- =====================================================================

-- INSERT IGNORE: bancos de dev que já têm 'admin'/'treinador' de outros
-- testes não devem quebrar a migração — só entram os logins que faltam.
INSERT IGNORE INTO tbl_usuario (nome_usuario, email_usuario, login_usuario, senha_usuario, tipo_usuario)
VALUES
  ('Administrador', 'admin@laivy.local',     'admin',     '$2a$12$9MapQiYd2Gy6G4K.0mHtguwxlrYxKcccWnqOWWT4jCPrCswdKDstK', 1),
  ('Treinador',      'treinador@laivy.local', 'treinador', '$2a$12$5N1vG29coCkZn9Z1EDLtve41Tqhkwws1hDhOUyCAN12Zj/Dwbhy0e', 2),
  ('Atleta',         'atleta@laivy.local',    'atleta',    '$2a$12$2kQgBIiqU2J3b/BtgCdwGOYZZAgB/wE09WdaneVoLURF53ZhAcYKG', 3);
