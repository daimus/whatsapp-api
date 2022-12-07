import mongoose from 'mongoose';
import mongoosePagination from 'mongoose-paginate-v2';
import IMessage from '@/interfaces/IMessage';

const historiesSchema = new mongoose.Schema(
  {
    status: String,
    timestamp: Number,
  },
  {
    _id: false,
  },
);

const Message = new mongoose.Schema(
  {
    batchCode: {
      type: String,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      unique: true,
    },
    whatsappMessageId: {
      type: String,
      default: null,
    },
    receiver: {
      type: String,
      required: true,
    },
    jid: {
      type: String,
    },
    failReason: {
      type: String,
      default: null,
    },
    message: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      default: null,
    },
    histories: {
      type: [historiesSchema],
      default: [],
    },
  },
  { timestamps: true },
).plugin(mongoosePagination);

export default mongoose.model<IMessage & mongoose.Document>('Message', Message);
