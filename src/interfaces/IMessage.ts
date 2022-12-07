export default interface IMessage {
  _id: string;
  batchCode: string;
  jobId: string;
  schedule: string | Date | number | null;
  whatsappMessageId: string | null;
  receiver: string;
  jid: string;
  message: any;
  status: string | null;
  failReason: string | null;
  histories: Array<{
    status: string;
    timestamp: number;
  }>;
}

export interface IMessageInputDTO {
  schedule?: string | Date | number | null;
  whatsappMessageId?: string;
  receiver?: string | null;
  receivers?: Array<string>;
  jid?: string;
  message?: any;
  failReason?: string;
  batchCode?: string;
  histories?: Array<{
    status: string;
    timestamp: number;
  }>;
}

export interface IMessageHistory {
  status: string;
  timestamp: number;
}
