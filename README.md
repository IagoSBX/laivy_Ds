# Sistema Gerenciador Esportivo
### TCC — ETEC 02/2026
**Grupo:** Iago Silva · Victor Hugo · Yago Ribeiro · Leonardo Assis · Arthur

---

## 🚀 Como rodar o projeto

### 1. Pré-requisitos
- Java 21+
- Maven 3.x
- MySQL 8.x
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

### 4. Rodar o backend

```bash
./mvnw spring-boot:run
```

O servidor inicia em: **http://localhost:8080**

---

### 5. Acessar o sistema

Abra no navegador:

```
http://localhost:8080/login.html
```

### Credenciais padrão

| Perfil       | Login      | Senha |
|-------------|-----------|-------|
| Administrador | admin    | admin |
| Treinador     | treinador | 1234  |
| Atleta        | atleta    | 1234  |

---

## 📁 Estrutura do Projeto

```
projeto/
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
    │       └── static/
    │           ├── login.html
    │           ├── dashboard.html
    │           ├── usuarios.html
    │           ├── exames.html
    │           ├── desempenho.html
    │           ├── atividades.html
    │           ├── calendario.html
    │           └── visitantes.html
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
