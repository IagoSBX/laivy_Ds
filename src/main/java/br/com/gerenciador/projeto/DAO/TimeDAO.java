package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Time;

public interface TimeDAO extends JpaRepository<Time, Integer> {

    // FIX: Spring Data não consegue parsear "ativo_time" por convenção de nome.
    // Usando @Query explícita para evitar o erro "No property 'ativo' found"
    @Query("SELECT t FROM Time t WHERE t.ativo_time = :ativo")
    List<Time> findByAtivo_time(@Param("ativo") Integer ativo);

    @Query("SELECT t FROM Time t WHERE t.treinador.id_usuario = :idTreinador")
    List<Time> findByTreinador(@Param("idTreinador") Integer idTreinador);

    @Query("SELECT t FROM Time t WHERE LOWER(t.nome_time) LIKE LOWER(CONCAT('%', :nome, '%'))")
    List<Time> buscarPorNome(@Param("nome") String nome);
}
