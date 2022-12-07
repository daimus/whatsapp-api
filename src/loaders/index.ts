import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import mongooseLoader from './mongoose';
import jobsLoader from './jobs';
import Logger from './logger';
import whatsappLoader from './whatsapp';
import './events';

export default async ({ expressApp, startNewSession }) => {
  const mongoConnection = await mongooseLoader();
  Logger.info('✌️ DB loaded and connected!');

  const messageModel = {
    name: 'messageModel',
    model: require('../models/message').default,
  };

  const { agenda } = await dependencyInjectorLoader({
    mongoConnection,
    models: [messageModel],
  });
  Logger.info('✌️ Dependency Injector loaded');

  await jobsLoader({ agenda });
  Logger.info('✌️ Jobs loaded');

  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');

  await whatsappLoader(startNewSession);
  Logger.info('✌️ WhatsApp loaded');
};
