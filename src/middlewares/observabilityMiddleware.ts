import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';

// Inicializa as métricas padrão do Node (CPU, Memória, etc)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// Criação do Histograma (Tempo de resposta)
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5] // Buckets para o SLO de 300ms
});

// Criação do Contador (Total de requisições)
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware de Observabilidade
export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const durationInSeconds = process.hrtime(start)[1] / 1e9; // Converte nanosegundos para segundos
    const route = req.route ? req.route.path : req.path;
    
    // Atualiza as métricas
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(durationInSeconds);

    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();

    // Gera Log Estruturado (Apenas para erros ou requisições lentas)
    if (res.statusCode >= 400 || durationInSeconds > 0.5) {
      logger.warn('Requisição Anormal', {
        method: req.method,
        route,
        status: res.statusCode,
        duration_ms: (durationInSeconds * 1000).toFixed(2),
        ip: req.ip
      });
    }
  });

  next();
};