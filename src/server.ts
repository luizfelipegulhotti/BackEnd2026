import app from "./app";
import { startEventConsumer } from "./workers/eventConsumer"; // <-- NOVO
import { logger } from "./utils/logger";

const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Servidor rodando na porta ${PORT} (acessível externamente)`);
  
  // Inicia o consumidor de eventos (Pub/Sub)
  startEventConsumer();
});