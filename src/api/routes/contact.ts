import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { Container } from 'typedi';
import R from '@/R';
import { celebrate, Joi } from 'celebrate';
import ContactService from '@/services/contact';
import WhatsappService from '@/services/whatsapp';
import middlewares from '@/api/middlewares';
const route = Router();

export default (app: Router) => {
  app.use('/contacts', route);

  route.get(
    '/:phone/verify',
    middlewares.isAuth,
    celebrate({
      params: {
        phone: Joi.string().required(),
      },
      query: {
        countryCode: Joi.string().default(process.env.DEFAULT_COUNTRY_CODE).allow(null, ''),
      },
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const contactServiceInstance = Container.get(ContactService);
        const contact = contactServiceInstance.Format(req.params.phone, req.query.countryCode);
        const profile = await contactServiceInstance.Verify(contact.jid);
        if (!profile.isOnWhatsapp) {
          contact.jid = null;
        }
        next(
          new R({
            data: {
              ...contact,
              ...profile,
            },
          }),
        );
      } catch (e) {
        logger.error('🔥 error: %o', e);
        next(e);
      }
    },
  );
};
