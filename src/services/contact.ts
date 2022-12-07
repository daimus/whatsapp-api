import { Service, Inject } from 'typedi';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import { parsePhoneNumber } from 'libphonenumber-js';
import { isJidGroup, isJidUser, isJidBroadcast, isJidStatusBroadcast } from '@adiwajshing/baileys';
import WhatsappService from '@/services/whatsapp';
import { profile } from 'winston';
import _ from 'lodash';

@Service()
export default class ContactService {
  constructor(
    @Inject('logger') private logger,
    private whatsapp: WhatsappService,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public IsJid(jid) {
    const jids = [isJidGroup(jid), isJidUser(jid), isJidBroadcast(jid), isJidStatusBroadcast(jid)];
    return jids.includes(true);
  }
  public Format(phone, countryCode = null) {
    const result = {
      phone: null,
      jid: null,
    };

    if (countryCode === null) {
      countryCode = process.env.DEFAULT_COUNTRY_CODE;
    }
    const phoneNumber = parsePhoneNumber(phone, countryCode);
    let formatted = phoneNumber.format('E.164');
    formatted = formatted.replaceAll(/[^0-9.]/g, '');
    result.phone = formatted;
    const jid = formatted + '@s.whatsapp.net';
    if (isJidUser(jid)) {
      result.jid = jid;
    }

    return result;
  }

  public async Verify(jid) {
    const result = {
      isOnWhatsapp: null,
      isBusinessAccount: false,
      profile: null,
      businessProfile: null,
    };
    result.isOnWhatsapp = await this.whatsapp.IsOnWhatsapp(jid);
    if (result.isOnWhatsapp) {
      const businessProfile = await this.whatsapp.GetBusinessProfile(jid);
      const basicProfile = await this.whatsapp.GetBasicProfile(jid);
      result.isBusinessAccount = !_.isEmpty(businessProfile);
      if (businessProfile) {
        result.profile = basicProfile;
        result.businessProfile = {
          description: businessProfile.description,
          website: businessProfile.website,
          email: businessProfile.email,
          category: businessProfile.category,
          businessHours: businessProfile.business_hours,
        };
      }
    }
    return result;
  }
}
