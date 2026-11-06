# Mensageria e Assinatura de Eventos (Redis Pub/Sub)

## 1. Arquitetura Orientada a Eventos
Implementamos o padrão **Pub/Sub (Publish/Subscribe)** usando o Redis para desacoplar as ações do sistema. Quando uma entidade sofre alteração, a API não precisa esperar processos secundários (como envio de e-mail ou invalidação de cache em outros microsserviços) terminarem.

## 2. Fluxo de Funcionamento
1. **Publisher (Produtor):** O `ClienteService` publica um evento no canal `cliente.criado`, `cliente.atualizado` ou `cliente.deletado` assim que a transação no banco termina.
2. **Broker:** O Redis recebe a mensagem e a distribui instantaneamente para todos os inscritos.
3. **Subscriber (Consumidor):** O `eventConsumer.ts` escuta esses canais e processa a mensagem de forma assíncrona (ex: gerando logs estruturados, simulando envio de e-mail, etc.).

## 3. Canais (Channels) Definidos
| Canal | Momento do Disparo | Payload |
|-------|--------------------|---------|
| `cliente.criado` | Após inserção no banco | `{ id, nome, email }` |
| `cliente.atualizado` | Após update no banco | `{ id, nome }` |
| `cliente.deletado` | Após soft delete no banco | `{ id, nome }` |

## 4. Vantagens da Abordagem
* **Desacoplamento:** O serviço de clientes não conhece o serviço de e-mail (ou qualquer outro).
* **Performance:** A resposta HTTP do `POST /clientes` retorna rápido, pois o processamento secundário ocorre em background.
* **Escalabilidade:** Podemos ter vários consumidores escutando o mesmo canal se necessário (ex: um para logs e outro para e-mails).

## 5. Comprovação de Circulação de Mensagens
Através do logger `Winston`, todas as publicações e recebimentos são registrados em JSON, comprovando o tráfego:
* `📤 Evento publicado [cliente.criado]`
* `📥 Mensagem recebida no canal [cliente.criado]`