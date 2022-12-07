import { Inject, Service } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  isJidGroup,
  isJidUser,
  proto,
  useMultiFileAuthState,
  UserFacingSocketConfig,
} from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import events from '@/subscribers/events';
import * as fs from 'fs';
import P from 'pino';
import _ from 'lodash';
import WebMessageInfo = proto.WebMessageInfo;

@Service()
export default class WhatsappService {
  private sock;

  constructor(@Inject('logger') private logger, @EventDispatcher() private eventDispatcher: EventDispatcherInterface) {}

  public GetSessionState() {
    const states = ['connecting', 'connected', 'disconnecting', 'disconnected'];
    if (!this.sock) {
      return states[3];
    }
    const state = this.sock.ws.readyState;
    return states[state];
  }

  public async StartSession(startNewSession = false) {
    if (startNewSession) {
      this.DeleteSession();
    }
    const { state, saveCreds } = await useMultiFileAuthState(process.env.SESSION_DIRECTORY);
    const waConfig = {
      auth: state,
      logger: P({ level: 'silent' }),
      printQRInTerminal: true,
      browser: Browsers.ubuntu('Chrome'),
    } as UserFacingSocketConfig;
    this.sock = makeWASocket(waConfig);
    this.sock.ev.on('connection.update', update => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.error(`🔥 connection closed due to ${lastDisconnect.error}, reconnecting: ${shouldReconnect}`);
        this.eventDispatcher.dispatch(events.whatsapp.incomingMessage, {
          reason: lastDisconnect.error,
        });
        if (shouldReconnect) {
          this.StartSession();
        }
      } else if (connection === 'open') {
        this.logger.info(`🟢 Opened Connection`);
      }
      if (update.qr) {
        this.logger.info(`⚄ Received QR`, update.qr);
      }
    });
    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('messages.upsert', async messages => {
      if (messages.type === 'notify') {
        for (const message of messages.messages) {
          if (!message.key.fromMe) {
            this.eventDispatcher.dispatch(events.whatsapp.incomingMessage, {
              sender: message.key.remoteJid,
              message: message.message.conversation,
              pushName: message.pushName,
            });
          }
        }
      }
    });
    this.sock.ev.on('messages.update', async messages => {
      for (const message of messages) {
        this.eventDispatcher.dispatch(events.whatsapp.messageUpdated, {
          messageId: null,
          whatsappMessageId: message.key.id,
          jid: message.key.remoteJid,
          status: _.findKey(WebMessageInfo.Status, i => i === message.update.status),
        });
      }
    });
  }

  public async IsOnWhatsapp(jid) {
    if (!this.sock) {
      throw new Error('Unable to connect whatsapp');
    }
    if (isJidUser(jid)) {
      const result = await this.sock.onWhatsApp(jid);
      return Boolean(result[0]?.exists);
    } else if (isJidGroup(jid)) {
      const result = await this.sock.groupMetadata(jid);
      return Boolean(result.id);
    }
    return false;
  }

  public GetBusinessProfile(jid) {
    return this.sock.getBusinessProfile(jid);
  }

  public async GetBasicProfile(jid) {
    try {
      return {
        status: await this.sock.fetchStatus(jid),
        displayPictureUrl: await this.sock.profilePictureUrl(jid, 'image'),
        presence: this.sock.presenceSubscribe(jid),
      };
    } catch (e) {
      this.logger.error(`🔥 Failed to get profile info: ${e.message}`);
      return null;
    }
  }

  public DeleteSession() {
    this.logger.info(`‼️ Delete Session`);
    fs.rmSync(process.env.SESSION_DIRECTORY, { recursive: true, force: true });
  }

  public async SendMessage(receiver, message) {
    if (!this.sock) {
      throw new Error('Unable to connect whatsapp');
    }
    return this.sock.sendMessage(receiver, message);
  }
}
