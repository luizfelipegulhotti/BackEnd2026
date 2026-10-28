import CircuitBreaker from 'opossum';
import { logger } from './logger';

// Configuração do Circuit Breaker
const breakerOptions = {
  timeout: 5000, // Se demorar mais de 5s, aborta (Timeout)
  errorThresholdPercentage: 50, // Se 50% das chamadas falharem, abre o circuito
  resetTimeout: 30000 // Tenta fechar o circuito após 30s
};

// Função utilitária de Resiliência (Retry + Timeout + Circuit Breaker)
export async function executeWithResilience<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  const breaker = new CircuitBreaker(operation, breakerOptions);

  breaker.on('open', () => logger.error(`🔴 Circuit Breaker ABERTO para: ${operationName}`));
  breaker.on('halfOpen', () => logger.warn(`🟡 Circuit Breaker MEIO-ABERTO para: ${operationName}`));
  breaker.on('close', () => logger.info(`🟢 Circuit Breaker FECHADO para: ${operationName}`));

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await breaker.fire();
    } catch (error) {
      lastError = error;
      logger.warn(`Tentativa ${attempt}/${maxRetries} falhou para ${operationName}. Erro: ${error}`);
      
      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Operação '${operationName}' falhou após ${maxRetries} tentativas. Erro original: ${lastError}`);
}