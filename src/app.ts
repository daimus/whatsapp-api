import 'reflect-metadata';

import config from './config';

import express from 'express';

import Logger from './loaders/logger';

const args = process.argv.slice(2);
async function startServer() {
  const app = express();
  const startNewSession = args.includes('--new');
  await require('./loaders').default({ expressApp: app, startNewSession: startNewSession });

  app
    .listen(config.port, () => {
      Logger.info(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);
    })
    .on('error', err => {
      Logger.error(err);
      process.exit(1);
    });
}

startServer();
