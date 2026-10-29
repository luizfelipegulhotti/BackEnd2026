# Estratégia de Deploy e Runbook de Incidentes

## 1. Estratégia de Deploy Definida: Rolling Update com Rollback Simples
Como o projeto utiliza Docker e Docker Compose, a estratégia adotada é o **Rolling Update** (Atualização Contínua) via substituição de containers.

**Como funciona:**
1. O código novo é enviado para o repositório.
2. O pipeline de CI/CD roda os testes e o build da nova imagem Docker.
3. O novo container substitui o antigo sem derrubar o banco de dados (que tem volume persistente).
4. **Rollback:** Se o novo container falhar ao iniciar (ex: erro de código ou variável de ambiente faltando), o comando `docker compose up -d` mantém o container antigo rodando ou podemos reverter rapidamente para a imagem anterior.

**Justificativa:** É a estratégia mais compatível com a arquitetura atual (Docker Compose local/servidor único), garantindo baixo downtime e facilidade de reversão.

---

## 2. Runbook de Incidentes (Como agir se o sistema cair)

Este documento descreve os passos para diagnosticar e resolver problemas na API.

### 🚨 Incidente 1: A API está fora do ar (Timeout ou Erro 502/504)
1. **Verificação Inicial:** O container está rodando?
   * Comando: `docker ps`
   * Se o container `concessionaria_backend` não estiver na lista, reinicie: `docker compose up -d backend`
2. **Verificação de Logs:** O que aconteceu antes de cair?
   * Comando: `docker logs concessionaria_backend --tail 100`
   * Verifique logs de erro (500) ou falhas de conexão com o banco.
3. **Verificação de Recursos (Observabilidade):** Acesse a rota `/metrics`. Se `nodejs_heap_size_used_bytes` estiver muito próximo do limite, a API pode ter sofrido *Out of Memory* (OOM). Solução temporária: `docker compose restart backend`.

### 🚨 Incidente 2: Banco de Dados indisponível
1. **Verificação:** O container do MySQL está saudável?
   * Comando: `docker ps` (Verifique o status "healthy" do container `concessionaria_mysql`).
   * Comando: `docker logs concessionaria_mysql`
2. **Ação:** Se o banco caiu, reinicie apenas ele: `docker compose restart mysql`. A API voltará a conectar automaticamente assim que o banco subir (graças à resiliência implementada no código).

### 🚨 Incidente 3: Falha no Deploy (Rollback)
1. **Sintoma:** Após atualizar o código, o front-end mostra erros de API.
2. **Ação de Rollback:**
   * Volte o código para a versão anterior (git): `git checkout HEAD~1`
   * Rebuild e suba o container: `docker compose up -d --build backend`
3. **Análise Pós-incidente:** Verifique os logs do pipeline no GitHub Actions para ver qual etapa falhou (Testes ou Build).

### 🔍 Monitoramento Contínuo
*   **Métricas:** Prometheus em `/metrics` (Latência, CPU, Memória).
*   **Logs:** Winston gerando JSON no terminal do Docker (`docker logs concessionaria_backend`).