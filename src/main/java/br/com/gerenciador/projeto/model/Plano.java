package br.com.gerenciador.projeto.model;

/** Planos mensais do treinador autocadastrado. Valor em centavos; limite conta só atletas. */
public enum Plano {
    BASIC("Basic", 30, false, 4999),
    PRO("Pro", 50, true, 14999),
    FULL("Full", 100, true, 24999);

    public final String nome;
    public final int limiteAtletas;
    public final boolean ia;
    public final int valorCentavos;

    Plano(String nome, int limiteAtletas, boolean ia, int valorCentavos) {
        this.nome = nome;
        this.limiteAtletas = limiteAtletas;
        this.ia = ia;
        this.valorCentavos = valorCentavos;
    }
}
