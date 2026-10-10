package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Atividade;
import jakarta.persistence.LockModeType;

public interface AtividadeDAO extends JpaRepository<Atividade, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Atividade a WHERE a.id_atividade = :id")
    java.util.Optional<Atividade> buscarPorIdComBloqueio(@Param("id") Integer id);

    /**
     * Atividades "do usuário": as que ele criou (treinador/admin) OU as que
     * ele foi escalado (atleta). Um atleta nunca é o "criador" de uma
     * Atividade — sem o OR pela Escalacao esta consulta sempre voltava
     * vazia pra qualquer atleta (era o que o perfil dele e o widget de
     * perfil da sidebar usavam pra montar "atividades recentes").
     */
    @Query("SELECT DISTINCT a FROM Atividade a WHERE a.usuario.id_usuario = :id " +
           "OR a.id_atividade IN (SELECT e.atividade.id_atividade FROM Escalacao e WHERE e.usuario.id_usuario = :id) " +
           "ORDER BY a.data_atividade DESC")
    List<Atividade> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT a FROM Atividade a WHERE a.tipo_atividade = :tipo")
    List<Atividade> buscarPorTipo(@Param("tipo") Integer tipo);

    @Query("SELECT a FROM Atividade a WHERE a.time.id_time = :idTime ORDER BY a.data_atividade DESC")
    List<Atividade> buscarPorTime(@Param("idTime") Integer idTime);
}
