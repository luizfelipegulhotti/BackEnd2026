import { Router, Request, Response } from 'express';
import client from 'prom-client';

const metricsRouter = Router();

metricsRouter.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

export default metricsRouter;