import { Router } from 'express';
import auth from './routes/auth';
import agendash from './routes/agendash';
import session from './routes/session';
import contact from '@/api/routes/contact';
import message from './routes/message';

export default () => {
  const app = Router();
  auth(app);
  agendash(app);
  session(app);
  contact(app);
  message(app);
  return app;
};
