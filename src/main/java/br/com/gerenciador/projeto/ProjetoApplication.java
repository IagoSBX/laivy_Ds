package br.com.gerenciador.projeto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.web.servlet.ServletComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EntityScan("br.com.gerenciador.projeto.model")
@EnableJpaRepositories("br.com.gerenciador.projeto.DAO")
@ServletComponentScan
@EnableAsync        // log de auditoria gravado em segundo plano
@EnableScheduling   // limpeza diária do log de auditoria
public class ProjetoApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(ProjetoApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(ProjetoApplication.class, args);
    }
}
