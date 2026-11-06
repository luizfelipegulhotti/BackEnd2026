import { redis } from '../config/redis';
import { logger } from './logger';

export const EventPublisher = {
  /**
   * Publica um evento no canal do Redis de forma assíncrona.
   */
  async publish(channel: string, payload: any): Promise<void> {
    try {
      const message = JSON.stringify({
        event: channel,
        timestamp: new Date().toISOString(),
        payload,
      });

      // Publica no canal
      await redis.publish(channel, message);
      
      logger.info(`📤 Evento publicado [${channel}]`, { payload });
    } catch (error) {
      logger.error(`❌ Erro ao publicar evento [${channel}]`, error);
    }
  }
};