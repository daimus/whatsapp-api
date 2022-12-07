import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { Container } from 'typedi';
import WhatsappService from '@/services/whatsapp';
import R from '@/R';
import { celebrate, Joi } from 'celebrate';
import ContactService from '@/services/contact';
import middlewares from '@/api/middlewares';
import MessageService from '@/services/message';
import { IMessageInputDTO } from '@/interfaces/IMessage';
import _ from 'lodash';
import { proto } from '@adiwajshing/baileys';
import WebMessageInfo = proto.WebMessageInfo;
import ILooseObject from '@/interfaces/ILooseObject';
import InvalidMessageError from '@/errors/InvalidMessageError';
const route = Router();

export default (app: Router) => {
  app.use('/messages', route);

  const messageSchema = {
    message: Joi.object({
      text: Joi.string(),
      caption: Joi.string(),
      image: Joi.object({
        url: Joi.string().required(),
      }),
      video: Joi.object({
        url: Joi.string().required(),
      }),
      document: Joi.object({
        url: Joi.string().required(),
      }),
      mimeType: Joi.string().when('document', {
        is: Joi.exist(),
        then: Joi.required(),
      }),
      fileName: Joi.string(),
      buttons: Joi.array().items(
        Joi.object({
          buttonId: Joi.string(),
          buttonText: Joi.string(),
          type: Joi.number(),
        }),
      ),
      templateButtons: Joi.array().items(
        Joi.object({
          index: Joi.number(),
          urlButton: Joi.object({
            displayText: Joi.string().required(),
            url: Joi.string().required(),
          }),
          callButton: Joi.object({
            displayText: Joi.string().required(),
            phoneNumber: Joi.string().required(),
          }),
          quickReplyButton: Joi.object({
            displayText: Joi.string().required(),
            id: Joi.string().required(),
          }),
        }),
      ),
      sections: Joi.array().items(
        Joi.object({
          title: Joi.string().required(),
          rows: Joi.array().items(
            Joi.object({
              title: Joi.string().required(),
              rowId: Joi.string().required(),
              description: Joi.string(),
            }),
          ),
        }),
      ),
      buttonText: Joi.string(),
      title: Joi.string(),
      footer: Joi.string(),
    }).required(),
  };

  route.get('/', middlewares.isAuth, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const messageServiceInstance = Container.get(MessageService);
      const filter: ILooseObject = {};
      if (req.query.search) {
        filter.name = {
          $regex: req.query.search,
          $options: 'i',
        };
      }
      const { data, page } = await messageServiceInstance.GetMessages(
        filter,
        parseInt(<string>req.query.page),
        parseInt(<string>req.query.size),
      );
      next(new R({ data: data, page: page }));
    } catch (e) {
      logger.error('🔥 error: %o', e);
      next(e);
    }
  });

  route.get('/:id', middlewares.isAuth, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const messageServiceInstance = Container.get(MessageService);
      const message = await messageServiceInstance.GetMessage(req.params.id);
      next(new R({ data: message }));
    } catch (e) {
      logger.error('🔥 error: %o', e);
      next(e);
    }
  });

  route.delete('/:id', middlewares.isAuth, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const messageServiceInstance = Container.get(MessageService);
      await messageServiceInstance.DeleteMessage(req.params.id);
      next(new R({ httpCode: 204 }));
    } catch (e) {
      logger.error('🔥 error: %o', e);
      next(e);
    }
  });

  route.post(
    '/',
    middlewares.isAuth,
    celebrate({
      body: {
        receiver: Joi.string().required(),
        ...messageSchema,
        schedule: Joi.date().allow(null),
      },
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const messageServiceInstance = Container.get(MessageService);
        const result = await messageServiceInstance.CreateMessage(req.body as IMessageInputDTO);

        next(
          new R({
            data: result,
            message: 'message has been queued',
          }),
        );
      } catch (e) {
        logger.error('🔥 error: %o', e);
        next(e);
      }
    },
  );

  route.post(
    '/bulk',
    middlewares.isAuth,
    celebrate({
      body: {
        receivers: Joi.array().items(Joi.string()).required(),
        ...messageSchema,
        schedule: Joi.date().allow(null),
      },
    }),
    (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const messageServiceInstance = Container.get(MessageService);
        const result = messageServiceInstance.CreateMessageBulk(req.body as IMessageInputDTO);
        next(new R({ data: result, message: 'message has been queued' }));
      } catch (e) {
        logger.error('🔥 error: %o', e);
        next(e);
      }
    },
  );

  route.post(
    '/async',
    middlewares.isAuth,
    celebrate({
      body: {
        receiver: Joi.string().required(),
        countryCode: Joi.string().default(process.env.DEFAULT_COUNTRY_CODE).allow(null, ''),
        ...messageSchema,
      },
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const contactServiceInstance = Container.get(ContactService);
        const whatsappServiceInstance = Container.get(WhatsappService);
        const contact = contactServiceInstance.Format(req.body.receiver, req.body.countryCode);
        if (!(await whatsappServiceInstance.IsOnWhatsapp(contact.jid))) {
          throw new InvalidMessageError('Invalid receiver');
        }
        const result = await whatsappServiceInstance.SendMessage(contact.jid, req.body.message);
        next(
          new R({
            data: {
              jid: contact.jid,
              message: req.body.message,
              whatsappMessageId: result.key.id,
              status: _.findKey(WebMessageInfo.Status, i => i === result.status),
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
