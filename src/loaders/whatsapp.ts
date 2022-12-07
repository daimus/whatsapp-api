import { Container } from 'typedi';
import WhatsappService from '@/services/whatsapp';

export default startNewSession => {
  const whatsappServiceInstance = Container.get(WhatsappService);
  whatsappServiceInstance.StartSession(startNewSession);
};
