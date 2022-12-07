import { Container, Inject, Service } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import WhatsappService from '@/services/whatsapp';
import { IMessageHistory, IMessageInputDTO } from '@/interfaces/IMessage';
import moment from 'moment';
import _ from 'lodash';
import ContactService from '@/services/contact';
import { proto } from '@adiwajshing/baileys';
import MessageKey = proto.MessageKey;
import events from '@/subscribers/events';
import { randomUUID } from 'crypto';

@Service()
export default class MessageService {
  constructor(
    @Inject('messageModel') private messageModel: Models.MessageModel,
    private whatsapp: WhatsappService,
    private contact: ContactService,
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async GetMessage(filter: any) {
    if (typeof filter === 'string') {
      filter = {
        _id: filter,
      };
    }
    return this.messageModel.findOne(filter);
  }

  public async GetMessages(filter: any, offset: number, limit: number) {
    const result = await this.messageModel.paginate(filter, {
      page: isNaN(offset) ? 1 : offset,
      limit: isNaN(limit) ? 10 : limit,
    });
    const { docs, ...page } = result;
    return { data: docs, page };
  }

  public async CreateMessage(messageInputDTO: IMessageInputDTO) {
    const agendaInstance = Container.get('agendaInstance');
    let result;
    let jid;
    if (this.contact.IsJid(messageInputDTO.receiver)) {
      jid = messageInputDTO.receiver;
    } else {
      const contact = this.contact.Format(messageInputDTO.receiver);
      jid = contact.jid;
    }

    if (!(await this.whatsapp.IsOnWhatsapp(jid))) {
      const message = await this.messageModel.create({
        ...messageInputDTO,
        status: 'ERROR',
        failReason: 'Invalid receiver',
      });
      this.eventDispatcher.dispatch(events.whatsapp.messageUpdated, {
        messageId: message._id,
        whatsappMessageId: null,
        jid: null,
        status: 'ERROR',
      });
      return message;
    }
    messageInputDTO.jid = jid;
    if (messageInputDTO.schedule) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      result = await agendaInstance.schedule(
        moment(messageInputDTO.schedule).toDate(),
        'send-whatsapp-message',
        messageInputDTO,
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      result = await agendaInstance.now('send-whatsapp-message', messageInputDTO);
    }
    return this.messageModel.create({
      jobId: result.attrs._id,
      ...messageInputDTO,
    });
  }

  public CreateMessageBulk(messageInputDTO: IMessageInputDTO) {
    const batchCode = randomUUID();
    const scheduledAt = messageInputDTO.schedule ? moment(messageInputDTO.schedule).unix() : moment().unix();
    const receivers = messageInputDTO.receivers;
    delete messageInputDTO.receivers;
    const messages = [];
    receivers.forEach((receiver, index) => {
      const sendAt = scheduledAt + parseInt(process.env.DELAY_BULK_MESSAGE) * index;
      messages.push({
        batchCode: batchCode,
        receiver: receiver,
        schedule: moment.unix(sendAt).toDate(),
        message: messageInputDTO.message,
      });
    });
    Promise.all(
      messages.map(async message => {
        await this.CreateMessage(message);
      }),
    );
    return { batchCode };
  }

  public async UpdateMessage(filter, messageInputDTO: IMessageInputDTO) {
    if (typeof filter === 'string' && filter.match(/^[0-9a-fA-F]{24}$/)) {
      filter = {
        _id: filter,
      };
    }
    if (typeof filter !== 'object') {
      filter = {};
    }
    return this.messageModel.updateOne(filter, messageInputDTO);
  }

  public async UpdateMessageHistory(filter, messageHistory: IMessageHistory) {
    if (typeof filter === 'string' && filter.match(/^[0-9a-fA-F]{24}$/)) {
      filter = {
        _id: filter,
      };
    }
    if (typeof filter !== 'object') {
      filter = {};
    }
    const message = await this.GetMessage(filter);
    if (message) {
      message.histories.push(messageHistory);
      return this.messageModel.updateOne(filter, {
        status: messageHistory.status,
        histories: _.uniqBy(message.histories, 'status'),
      });
    }
    return false;
  }

  public async DeleteMessage(id: string) {
    const message = await this.GetMessage(id);
    if (!message) {
      throw new Error('message not found');
    }
    if (!message.whatsappMessageId || !message.receiver) {
      throw new Error('invalid message key');
    }
    const contactServiceInstance = Container.get(ContactService);
    if (!contactServiceInstance.IsJid(message.receiver)) {
      throw new Error('invalid message key jid');
    }
    const whatsappServiceInstance = Container.get(WhatsappService);
    const result = await whatsappServiceInstance.SendMessage(message.receiver, {
      delete: {
        id: message.whatsappMessageId,
        fromMe: true,
        remoteJid: message.receiver,
      } as MessageKey,
    });
    if (result) {
      return this.messageModel.deleteOne({ _id: id });
    }
    return false;
  }
}
