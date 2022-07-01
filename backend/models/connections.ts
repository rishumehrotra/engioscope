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

export type Connection = { _id: ObjectId } & (
  | AzurePATConnection
  | SonarConnection
);

const connectionSchema = new Schema<Connection>({}, { strict: false });
const DBConnection = model<Connection>('Connection', connectionSchema);

export const listConnections = () => DBConnection.find().lean();

export const getConnectionById = (id: ObjectId | string) => (
  DBConnection.findOne({ _id: id }).lean()
);

export const createNewConnection = (connection: Omit<Connection, '_id'>) => (
  (new DBConnection(connection)).save()
);

export const modifyConnection = (connection: Connection) => (
  DBConnection.replaceOne({ _id: connection._id }, connection).lean()
);

export const deleteConnection = (id: ObjectId | string) => (
  DBConnection.deleteOne({ _id: id }).lean()
);
