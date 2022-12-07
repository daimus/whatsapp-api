import express from 'express';
import cors from 'cors';
import routes from '@/api';
import config from '@/config';
import { isCelebrateError } from 'celebrate';
import ILooseObject from '@/interfaces/ILooseObject';
import R from '@/R';
import _ from 'lodash';
import rateLimit from 'express-rate-limit';
export default ({ app }: { app: express.Application }) => {
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Transforms the raw string of req.body into json
  app.use(express.json());
  // Load API routes
  app.use(config.api.prefix, routes());

  // Rate limiter
  const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT) * 1000,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  app.use((data, req, res, next) => {
    if (data instanceof R) {
      const result: ILooseObject = {};
      if (!_.isEmpty(data.data)) {
        result.data = data.data;
      }
      if (data.message !== null) {
        result.message = data.message;
      }
      if (!_.isEmpty(data.page)) {
        result.page = data.page;
      }
      return res.status(data.httpCode).json(result);
    }
    next(data);
  });
  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
  });

  /// error handlers
  app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(err.status).send({ message: err.message }).end();
    }
    if (err.name === 'NotFoundError') {
      return res.status(err.status).send({ message: err.message, data: null }).end();
    }
    if (err.name === 'ValidationError') {
      const errors: ILooseObject = {};
      for (const p in err.errors) {
        errors[p] = err.errors[p]['message'];
      }
      return res.status(400).send({ errors: errors }).end();
    }
    if (isCelebrateError(err)) {
      const errors: { [k: string]: any } = {};
      const errorBody = err.details.get('body')?.details;
      for (const p in errorBody) {
        errors[errorBody[p]['path'].join('.')] = errorBody[p]['message'];
      }
      const errorQuery = err.details.get('query')?.details;
      for (const p in errorQuery) {
        errors[errorQuery[p]['path'].join('.')] = errorQuery[p]['message'];
      }
      const errorParam = err.details.get('params')?.details;
      for (const p in errorParam) {
        errors[errorParam[p]['path'].join('.')] = errorParam[p]['message'];
      }
      return res.status(400).send({ errors: errors }).end();
    }
    return next(err);
  });

  /// error handlers
  app.use((err, req, res, next) => {
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res.status(err.status).send({ message: err.message }).end();
    }
    return next(err);
  });
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
      },
    });
  });
};
