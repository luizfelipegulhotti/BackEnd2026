# Atributos de Qualidade, Resiliência e Observabilidade - Concessionária API

## 1. SLOs e SLIs (Service Level Objectives and Indicators)
Para garantir a qualidade do sistema, definimos os seguintes indicadores:

*   **Disponibilidade (Availability):**
    *   **SLI:** Porcentagem de requisições HTTP bem-sucedidas (status 2xx e 3xx) em relação ao total.
    *   **SLO:** 99.5% de disponibilidade mensal.
*   **Latência (Response Time):**
    *   **SLI:** Tempo de resposta das rotas da API (p95).
    *   **SLO:** 95% das requisições devem responder em menos de 300ms.
*   **Taxa de Erro (Error Rate):**
    *   **SLI:** Porcentagem de respostas com erro do servidor (status 5xx).
    *   **SLO:** Menos de 1% das requisições resultando em erro.

## 2. Estratégias de Resiliência Aplicadas
*   **Timeout:** Todas as requisições externas ou operações críticas de banco de dados terão um limite de tempo (ex: 5 segundos). Se exceder, a requisição é abortada para não travar o servidor.
*   **Retry (Tentativas):** Para operações de leitura/escrita que falham por instabilidade momentânea de rede, o sistema tentará novamente até 3 vezes com um intervalo exponencial (ex: 1s, 2s, 4s).
*   **Circuit Breaker (Disjuntor):** Se uma operação externa falhar repetidamente (ex: 5 vezes seguidas), o circuito "abre". Durante um período (ex: 30s), as requisições falham imediatamente (Fast Fail) sem tentar conectar, permitindo que o sistema externo se recupere.

## 3. Plano de Observabilidade
O sistema será monitorado através de duas frentes:

### Métricas (via Prometheus)
A rota `/metrics` exporá os seguintes dados:
*   `http_requests_total`: Contador de requisições por método, rota e status HTTP.
*   `http_request_duration_seconds`: Histograma do tempo de resposta das requisições (para calcular latência p95).
*   `nodejs_process_cpu_seconds_total`: Uso de CPU do processo Node.js.
*   `nodejs_memory_usage_bytes`: Uso de memória RAM.

### Logs (Estruturados via Winston)
*   **Logs de Acesso:** Formato JSON contendo `timestamp`, `method`, `url`, `status`, `duration_ms` e `ip`.
*   **Logs de Erro:** Formato JSON contendo `timestamp`, `message`, `stack_trace`, e `user_id` (se autenticado), para facilitar o debug em produção.