import { Container } from 'typedi';
import { EventSubscriber, On } from 'event-dispatch';
import events from './events';
import { Logger } from 'winston';
import axios from 'axios';
import MessageService from '@/services/message';
import moment from 'moment';
import ILooseObject from '@/interfaces/ILooseObject';

@EventSubscriber()
export default class WhatsappSubscriber {
  @On(events.whatsapp.incomingMessage)
  public onIncomingMessage({ sender, message, pushName }) {
    const Logger: Logger = Container.get('logger');

    try {
      if (process.env.INCOMING_MESSAGE_WEBHOOK_URL) {
        return axios.post(process.env.INCOMING_MESSAGE_WEBHOOK_URL, {
          sender: sender,
          message: message,
          pushName: pushName,
        });
      } else {
        Logger.warn(`⚠️ Incoming message webhook url not provided`);
      }
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.whatsapp.incomingMessage}: %o`, e);
      throw e;
    }
  }

  @On(events.whatsapp.messageUpdated)
  public async onMessageUpdated({ messageId, whatsappMessageId, jid, status }) {
    const Logger: Logger = Container.get('logger');

    try {
      const messageServiceInstance = Container.get(MessageService);
      const filter = {} as ILooseObject;
      if (messageId) {
        filter._id = messageId;
      }
      if (whatsappMessageId) {
        filter.whatsappMessageId = whatsappMessageId;
      }
      await messageServiceInstance.UpdateMessageHistory(filter, {
        status: status,
        timestamp: moment().unix(),
      });

      if (process.env.UPDATE_MESSAGE_WEBHOOK_URL) {
        const message = messageServiceInstance.GetMessage(filter);
        axios.patch(process.env.UPDATE_MESSAGE_WEBHOOK_URL, message);
      }
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.whatsapp.messageUpdated}: %o`, e);
      throw e;
    }
  }

  @On(events.whatsapp.connected)
  public onConnected() {
    const Logger: Logger = Container.get('logger');

    try {
      // todo: handle connected
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.whatsapp.connected}: %o`, e);
      throw e;
    }
  }

  @On(events.whatsapp.disconnected)
  public onDisconnected({ reason }) {
    const Logger: Logger = Container.get('logger');

    try {
      // todo: handle disconnected
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.whatsapp.disconnected}: %o`, e);
      throw e;
    }
  }
}
