package br.com.gerenciador.projeto.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * O frontend é um app React (pasta frontend/, build em static/). As telas
 * mantêm as URLs antigas (/login.html, /dashboard.html...) e todas abrem o
 * mesmo index.html — quem escolhe a tela é o roteador do React.
 * "index" fica de fora do padrão para o forward não cair aqui de novo.
 */
@Controller
public class SpaController {

    @GetMapping({"/", "/{tela:(?!index\\.)[a-z-]+}.html"})
    public String spa() {
        return "forward:/index.html";
    }
}
