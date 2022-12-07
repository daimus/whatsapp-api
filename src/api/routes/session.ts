import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { Container } from 'typedi';
import WhatsappService from '@/services/whatsapp';
import R from '@/R';
import middlewares from '@/api/middlewares';
const route = Router();

export default (app: Router) => {
  app.use('/sessions', route);

  route.get('/status', middlewares.isAuth, (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const whatsappServiceInstance = Container.get(WhatsappService);
      const state = whatsappServiceInstance.GetSessionState();
      next(new R({ data: { status: state } }));
    } catch (e) {
      logger.error('🔥 error: %o', e);
      next(e);
    }
  });

  route.delete('/', middlewares.isAuth, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const whatsappServiceInstance = Container.get(WhatsappService);
      await whatsappServiceInstance.DeleteSession();
      next(new R({ message: 'session deleted' }));
    } catch (e) {
      logger.error('🔥 error: %o', e);
      next(e);
    }
  });
};
