import { Document, Model, PaginateModel } from 'mongoose';
import IMessage from '@/interfaces/IMessage';
declare global {
  namespace Express {}

  namespace Models {
    export type MessageModel = PaginateModel<IMessage & Document>;
  }
}
