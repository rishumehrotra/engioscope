import type { ObjectId } from 'mongoose';
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

export type Connection = (
  | AzurePATConnection
  | SonarConnection
);

const discriminatorKey = { discriminatorKey: 'type' };

const connectionSchema = new Schema<Connection>({}, {
  timestamps: true,
  ...discriminatorKey
});
const ConnectionModel = model<Connection>('Connection', connectionSchema);

const azurePATConnectionSchema = new Schema<AzurePATConnection>({
  host: { type: String, required: true },
  token: { type: String, required: true },
  verifySsl: { type: Boolean, default: true }
}, { ...discriminatorKey });

const AzurePATConnectionModel = ConnectionModel.discriminator(
  'azure-pat', azurePATConnectionSchema
);

const sonarConnectionSchema = new Schema<SonarConnection>({
  url: { type: String, required: true },
  token: { type: String },
  verifySsl: { type: Boolean, default: true }
}, { ...discriminatorKey });

const SonarConnectionModel = ConnectionModel.discriminator(
  'sonar', sonarConnectionSchema
);

export const getConnections = () => ConnectionModel.find().lean();

export const getConnectionById = (id: ObjectId | string) => (
  ConnectionModel.findOne({ _id: id }).lean()
);

export const createAzurePATConnection = (connection: AzurePATConnection) => (
  AzurePATConnectionModel.create(connection)
);

export const createSonarConnection = (connection: SonarConnection) => (
  SonarConnectionModel.create(connection)
);

export const modifyConnection = (connection: Connection & { _id: ObjectId }) => (
  ConnectionModel.replaceOne({ _id: connection._id }, connection).lean()
);

export const deleteConnection = (id: ObjectId | string) => (
  ConnectionModel.deleteOne({ _id: id }).lean()
);
