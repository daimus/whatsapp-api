import config from '@/config';
import Agenda from 'agenda';
import SendWhatsappMessage from '@/jobs/sendWhatsappMessage';

export default ({ agenda }: { agenda: Agenda }) => {
  agenda.define(
    'send-whatsapp-message',
    { priority: 'high', concurrency: config.agenda.concurrency },
    new SendWhatsappMessage().handler,
  );

  agenda.start();
};
