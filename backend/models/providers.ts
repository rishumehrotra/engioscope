import type { ObjectId } from 'mongoose';
import { Schema, model } from 'mongoose';

export type TProvider = {
  type:
  | 'azure-devops-work-items'
  | 'azure-devops-repos';
  connection: ObjectId;
  config: Map<string, string>;
};

const providerSchema = new Schema<TProvider>({
  type: { type: String, required: true },
  config: {
    type: Map,
    of: String,
    required: true
  },
  connection: { type: Schema.Types.ObjectId, ref: 'Connection' }
});

const Provider = model<TProvider>('Provider', providerSchema);

export const listProviders = () => Provider.find().populate('connection').lean();

export const addProvider = (provider: TProvider) => (new Provider(provider)).save();
