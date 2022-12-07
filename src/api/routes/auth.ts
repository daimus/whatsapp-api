import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AuthService from '@/services/auth';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import R from '@/R';
import middlewares from '@/api/middlewares';

const route = Router();

export default (app: Router) => {
  app.use('/auth', route);

  route.post(
    '/signin',
    celebrate({
      body: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Sign-In endpoint with body: %o', req.body);
      try {
        const { username, password } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { token } = await authServiceInstance.SignIn(username, password);
        next(new R({ data: { token: token } }));
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
