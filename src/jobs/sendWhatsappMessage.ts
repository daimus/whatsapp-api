import { Container } from 'typedi';
import { Logger } from 'winston';
import WhatsappService from '@/services/whatsapp';
import ContactService from '@/services/contact';
import axios from 'axios';
import { proto } from '@adiwajshing/baileys';
import WebMessageInfo = proto.WebMessageInfo;
import _ from 'lodash';
import moment from 'moment';
import MessageService from '@/services/message';

export default class SendWhatsappMessage {
  public async handler(job, done): Promise<void> {
    const Logger: Logger = Container.get('logger');
    const messageServiceInstance = Container.get(MessageService);
    let whatsappMessageId = null;
    const jobId = job.attrs._id;
    const result = {
      status: null,
      timestamp: moment().unix(),
    };

    try {
      Logger.debug('✌️ Send WhatsApp Message Job triggered!');
      const contactServiceInstance = Container.get(ContactService);
      const whatsappServiceInstance = Container.get(WhatsappService);

      const { receiver, message } = job.attrs.data;

      let jid;
      if (contactServiceInstance.IsJid(receiver)) {
        jid = receiver;
      } else {
        const contact = contactServiceInstance.Format(receiver);
        jid = contact.jid;
      }
      if (await whatsappServiceInstance.IsOnWhatsapp(jid)) {
        const r = await whatsappServiceInstance.SendMessage(jid, message);
        whatsappMessageId = r.key.id;
        result.status = _.findKey(WebMessageInfo.Status, i => i === r.status);
      }
      await messageServiceInstance.UpdateMessage(
        { jobId: jobId },
        {
          whatsappMessageId: whatsappMessageId,
        },
      );
      done();
    } catch (e) {
      Logger.error('🔥 Error with Send WhatsApp Message Job: %o', e);
      await messageServiceInstance.UpdateMessage(
        { jobId: jobId },
        {
          failReason: e.message,
        },
      );
      done(e);
    }

    messageServiceInstance.UpdateMessageHistory({ jobId: jobId }, result);

    if (process.env.SENDING_MESSAGE_WEBHOOK_URL) {
      axios.post(process.env.SENDING_MESSAGE_WEBHOOK_URL, {
        whatsappMessageId: whatsappMessageId,
        jobId: jobId,
        ...result,
      });
    }
  }
}
