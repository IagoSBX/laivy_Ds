-- Treinador responsável por um time (tbl_time.id_treinador) que não era membro
-- de time nenhum (tbl_usuario.id_time nulo) via o time mas levava 403 em tudo,
-- porque as permissões de treinador valem para o time de que ele é membro.
-- Vincula cada um ao time que ele treina (o de menor id, se forem vários).
-- Daqui em diante o TimeService já faz isso ao criar/editar o time.
UPDATE tbl_usuario u
JOIN (SELECT id_treinador, MIN(id_time) AS id_time
        FROM tbl_time
       WHERE id_treinador IS NOT NULL
       GROUP BY id_treinador) t ON t.id_treinador = u.id_usuario
   SET u.id_time = t.id_time
 WHERE u.id_time IS NULL
   AND u.tipo_usuario = 2;
