import { redis } from '../config/redis';
import { logger } from './logger';

// Tempo de expiração padrão: 60 segundos (TTL)
const DEFAULT_TTL = 60;

export const CacheService = {
  /**
   * Busca um dado no cache. Se não existir, executa a função `fetchData`,
   * salva no cache com TTL e retorna o resultado. (Padrão Cache-Aside)
   */
  async getOrSet<T>(key: string, fetchData: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    try {
      const cachedData = await redis.get(key);

      if (cachedData) {
        logger.info(`⚡ Cache HIT para a chave: ${key}`);
        return JSON.parse(cachedData) as T;
      }

      logger.info(`🐢 Cache MISS para a chave: ${key}. Buscando no banco...`);
      const data = await fetchData();

      if (data) {
        await redis.setex(key, ttl, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      // Se o Redis falhar, o sistema continua funcionando (Degradação graciosa)
      logger.error(`Erro no Redis (chave: ${key}). Buscando direto no banco.`, error);
      return fetchData();
    }
  },

  /**
   * Invalida (deleta) uma chave do cache.
   * Usado quando um dado é atualizado ou deletado.
   */
  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.info(`🗑️ Cache invalidado para a chave: ${key}`);
    } catch (error) {
      logger.error(`Erro ao invalidar cache (chave: ${key})`, error);
    }
  },

  /**
   * Invalida várias chaves que começam com um padrão.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`🗑️ Cache invalidado para padrão: ${pattern} (${keys.length} chaves)`);
      }
    } catch (error) {
      logger.error(`Erro ao invalidar cache (padrão: ${pattern})`, error);
    }
  }
};