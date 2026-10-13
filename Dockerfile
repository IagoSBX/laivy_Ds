# ---- frontend (React + Vite) ----
# O build sai em src/main/resources/static, que o Spring serve e de onde o
# SvgJogadaService lê img/quadra-fiba.svg — por isso vem antes do Maven.
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
COPY --from=frontend /app/src/main/resources/static ./src/main/resources/static
# Testes rodam à parte (precisam de um MySQL de verdade, que não existe
# neste estágio de build isolado) — skipTests só pula a execução, ainda
# compila os testes, então erro de compilação neles quebra o build.
RUN mvn -B clean package -DskipTests

# ---- runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# fontconfig + fontes: sem isso o Batik/FOP (SvgJogadaService/ExportacaoService)
# falha ou gera PNG/PDF sem texto ao rasterizar o SVG da prancheta.
RUN apk add --no-cache fontconfig ttf-dejavu

COPY --from=build /app/target/*.war app.war

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.war"]
