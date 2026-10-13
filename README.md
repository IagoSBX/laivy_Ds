# LAIVY
### TCC — ETEC 2026
**Grupo:** Iago Silva · Victor Hugo · Yago Ribeiro · Leonardo Assis · Joao Pedro

---

## 🚀 Como rodar o projeto

### 1. Pré-requisitos
- Java 21+
- Maven 3.x
- Node.js 22+ (frontend React)
- MySQL 8.x

> O jeito mais simples é o Docker (`docker compose up --build`, ver `LEIA-ME-DOCKER.txt`),
> que já builda o frontend e o backend juntos.
- Navegador moderno (Chrome, Firefox, Edge)

---

### 2. Banco de dados

Abra o MySQL e execute o script completo:

```sql
source banco.sql
```

Ou copie e cole o conteúdo do arquivo `banco.sql` no MySQL Workbench.

Isso cria o banco, todas as tabelas e os usuários iniciais.

---

### 3. Configurar a conexão

Edite o arquivo `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/sistema_esportivo?useSSL=false&serverTimezone=America/Sao_Paulo
spring.datasource.username=root
spring.datasource.password=SUA_SENHA_AQUI
```

---

### 4. Buildar o frontend e rodar o backend

O frontend é um app React (Vite) na pasta `frontend/`. O build dele sai em
`src/main/resources/static/` (gerado, fora do git), que o Spring serve — então
builde o frontend antes de subir o backend:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
./mvnw spring-boot:run
```

O servidor inicia em: **http://localhost:8080**

Para desenvolver o frontend com recarga automática, deixe o backend rodando em
:8080 e use `npm --prefix frontend run dev` (abre em http://localhost:5173 e
repassa as chamadas da API para o backend).

---

### 5. Acessar o sistema

Abra no navegador:

```
http://localhost:8080/login.html
```

### Credenciais padrão

As contas iniciais (`admin`, `treinador`, `atleta`) **não** usam mais as senhas
de exemplo: na subida o backend troca cada uma por uma senha temporária (com
troca obrigatória no primeiro acesso), que aparece só no log:

```bash
docker logs laivy-backend | grep "Senha padrao"
```

### Servidor / produção

Veja **[DEPLOY.md](DEPLOY.md)** (HTTPS, segredos, n8n, backups).

---

## 📁 Estrutura do Projeto

```
projeto/
├── Dockerfile                         ← builda frontend (Node) + backend (Maven)
├── banco.sql                          ← Script do banco de dados
├── pom.xml                            ← Dependências Maven
└── src/
    ├── main/
    │   ├── java/br/com/gerenciador/projeto/
    │   │   ├── ProjetoApplication.java
    │   │   ├── model/
    │   │   │   ├── Usuario.java
    │   │   │   ├── Exame.java
    │   │   │   ├── Desempenho.java
    │   │   │   ├── Atividade.java
    │   │   │   ├── Calendario.java
    │   │   │   └── Visitante.java
    │   │   ├── DAO/
    │   │   │   ├── IUsuario.java
    │   │   │   ├── ExameDAO.java
    │   │   │   ├── DesempenhoDAO.java
    │   │   │   ├── AtividadeDAO.java
    │   │   │   ├── CalendarioDAO.java
    │   │   │   └── VisitanteDAO.java
    │   │   └── controller/
    │   │       ├── UsuarioController.java
    │   │       ├── ExameController.java
    │   │       ├── DesempenhoController.java
    │   │       ├── AtividadeController.java
    │   │       ├── CalendarioController.java
    │   │       └── VisitanteController.java
    │   └── resources/
    │       ├── application.properties
    │       ├── db/migration/          ← migrations Flyway
    │       └── static/                ← GERADO pelo build do frontend (não editar)
    └── test/
frontend/                              ← app React (Vite)
├── index.html
├── public/img/                        ← logos e quadra-fiba.svg (o backend também lê no export)
└── src/
    ├── App.jsx                        ← rotas (mantêm as URLs antigas: /login.html, /dashboard.html…)
    ├── pages/                         ← uma tela por arquivo
    ├── components/                    ← Sidebar, Modal, CampoData, TimeForm…
    ├── lib/                           ← api, sessão, validações, ordenação
    ├── prancheta/                     ← motor do editor de jogadas (SVG, frames, player)
    └── styles/                        ← tema + CSS de cada tela (isolado por tela)
    └── test/
```

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /usuarios | Lista todos os usuários |
| GET | /usuarios/{id} | Busca usuário por ID |
| POST | /usuarios | Cadastra usuário |
| POST | /usuarios/login | Autentica usuário |
| PUT | /usuarios/{id} | Atualiza usuário |
| DELETE | /usuarios/{id} | Exclui usuário |
| GET | /exames | Lista exames |
| POST | /exames | Cadastra exame |
| PUT | /exames/{id} | Atualiza exame |
| DELETE | /exames/{id} | Exclui exame |
| GET | /desempenhos | Lista desempenhos |
| POST | /desempenhos | Cadastra desempenho |
| DELETE | /desempenhos/{id} | Exclui desempenho |
| GET | /atividades | Lista atividades |
| POST | /atividades | Cadastra atividade |
| PUT | /atividades/{id} | Atualiza atividade |
| DELETE | /atividades/{id} | Exclui atividade |
| GET | /calendarios | Lista calendário |
| POST | /calendarios | Cadastra resultado |
| DELETE | /calendarios/{id} | Exclui resultado |
| GET | /visitantes | Lista visitantes |
| POST | /visitantes | Cadastra visitante |
| DELETE | /visitantes/{id} | Exclui visitante |
