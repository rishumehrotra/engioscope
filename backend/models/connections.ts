import type { ObjectId } from 'mongoose';
import { Schema, model } from 'mongoose';

export type AzureConnection = {
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

export type Connection = { _id: ObjectId } & (
  | AzureConnection
  | SonarConnection
);

const connectionSchema = new Schema<Connection>({}, { strict: false });
const DBConnection = model<Connection>('Connection', connectionSchema);

export const listConnections = () => (
  DBConnection.find().exec() as Promise<Connection[]>
);

export const getConnectionById = (id: ObjectId | string) => (
  DBConnection.findOne({ _id: id }).exec() as Promise<Connection>
);

export const createNewConnection = (connection: Omit<Connection, '_id'>) => (
  (new DBConnection(connection)).save()
);

export const modifyConnection = (connection: Connection) => (
  DBConnection.replaceOne({ _id: connection._id }, connection).exec()
);

export const deleteConnection = (id: ObjectId | string) => (
  DBConnection.deleteOne({ _id: id }).exec()
);

export type TProvider = {
  type:
  | 'azure-devops-work-items'
  | 'azure-devops-repos';
  config: Map<string, string>;
};

const providerSchema = new Schema<TProvider>({
  type: { type: String, required: true },
  config: {
    type: Map,
    of: String
  }
});

export const Provider = model<TProvider>('Provider', providerSchema);

const provider = new Provider({
  type: 'azure-devops-work-items'
});

provider._id.toString();
