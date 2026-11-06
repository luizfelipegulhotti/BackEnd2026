# Estratégia de Cache Distribuído com Redis

## 1. Padrão escolhido: Cache-Aside
Optamos pelo padrão **Cache-Aside (Lazy Loading)**. A aplicação é responsável por gerenciar o cache:
1. A aplicação tenta ler o dado no Redis.
2. **Cache HIT:** Se encontrar, retorna imediatamente (sem tocar no banco).
3. **Cache MISS:** Se não encontrar, busca no MySQL via Prisma, salva no Redis com um TTL e retorna.

## 2. TTL (Time To Live)
- **Listagens (`clientes:all`, `clientes:paginated:*`):** TTL de **60 segundos**.
- **Cliente específico (`clientes:{id}`):** TTL de **60 segundos**.
- Isso garante que dados antigos não fiquem presos por muito tempo, mesmo que a invalidação falhe.

## 3. Invalidação de Cache
Sempre que um dado é **criado**, **atualizado** ou **deletado**, o cache correspondente é invalidado (deletado). Isso garante que a próxima leitura traga o dado mais recente do banco.

| Operação | Chaves invalidadas |
|----------|-------------------|
| `criar` | `clientes:all`, `clientes:paginated:*` |
| `atualizar` | `clientes:{id}`, `clientes:all`, `clientes:paginated:*` |
| `deletar` | `clientes:{id}`, `clientes:all`, `clientes:paginated:*` |

## 4. Resiliência (Degradação Graciosa)
Se o Redis cair, o sistema continua funcionando: o `CacheService` captura o erro, registra no log (Winston) e busca o dado direto no banco de dados. O cache é um **acelerador**, não uma dependência crítica.

## 5. Como demonstrar na apresentação
1. Faça uma requisição `GET /clientes` (primeira vez: log mostrará **Cache MISS**).
2. Faça a mesma requisição novamente (log mostrará **Cache HIT** e o tempo de resposta será muito menor).
3. Faça um `PUT /clientes/{id}` (log mostrará **Cache invalidado**).
4. Faça `GET /clientes` novamente (log mostrará **Cache MISS**, pois o dado foi invalidado).