import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { EventChannels } from '../config/events';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const startEventConsumer = () => {
  // Conexão exclusiva para o subscriber (não pode ser a mesma do cache)
  const subscriber = new Redis(redisUrl);

  // Escutando os eventos de cliente
  const channels = [
    EventChannels.CLIENTE_CRIADO,
    EventChannels.CLIENTE_ATUALIZADO,
    EventChannels.CLIENTE_DELETADO,
  ];

  subscriber.subscribe(...channels, (err, count) => {
    if (err) {
      logger.error('❌ Erro ao se inscrever nos canais do Redis', err);
      return;
    }
    logger.info(`🎧 Event Consumer iniciado. Escutando ${count} canais.`);
  });

  // O que fazer quando uma mensagem chegar
  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);
      
      // Log que comprova a circulação da mensagem
      logger.info(`📥 Mensagem recebida no canal [${channel}]`, {
        event: data.event,
        timestamp: data.timestamp,
        payload: data.payload
      });

      // Aqui você poderia disparar ações reais:
      // - Enviar e-mail de boas-vindas
      // - Atualizar um dashboard
      // - Invalidar cache em outro serviço
      
      if (channel === EventChannels.CLIENTE_CRIADO) {
        logger.info(`📧 [Simulação] Enviando e-mail de boas-vindas para o cliente ID: ${data.payload.id}`);
      }

    } catch (error) {
      logger.error(`❌ Erro ao processar mensagem do canal ${channel}`, error);
    }
  });
};