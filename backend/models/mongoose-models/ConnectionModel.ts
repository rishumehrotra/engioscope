import { Schema, model } from 'mongoose';

export type AzurePATConnection = {
  type: 'azure-pat';
  host: string;
  token: string;
  verifySsl: boolean;
};

export type SonarConnection = {
  type: 'sonar';
  url: string;
  token: string;
  verifySsl: boolean;
};

export type Connection = AzurePATConnection | SonarConnection;

const discriminatorKey = { discriminatorKey: 'type' };

const connectionSchema = new Schema<Connection>(
  {},
  {
    timestamps: true,
    ...discriminatorKey,
  }
);
export const ConnectionModel = model<Connection>('Connection', connectionSchema);

const azurePATConnectionSchema = new Schema<AzurePATConnection>(
  {
    host: { type: String, required: true },
    token: { type: String, required: true },
    verifySsl: { type: Boolean, default: true },
  },
  { ...discriminatorKey }
);

export const AzurePATConnectionModel = ConnectionModel.discriminator(
  'azure-pat',
  azurePATConnectionSchema
);

const sonarConnectionSchema = new Schema<SonarConnection>(
  {
    url: { type: String, required: true },
    token: { type: String },
    verifySsl: { type: Boolean, default: true },
  },
  { ...discriminatorKey }
);

export const SonarConnectionModel = ConnectionModel.discriminator(
  'sonar',
  sonarConnectionSchema
);
