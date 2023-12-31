import type { Types } from 'mongoose';
import type {
  AzurePATConnection,
  Connection,
  SonarConnection,
} from './mongoose-models/ConnectionModel.js';
import {
  AzurePATConnectionModel,
  SonarConnectionModel,
  ConnectionModel,
} from './mongoose-models/ConnectionModel.js';

export function getConnections(type: 'azure-pat'): Promise<
  (AzurePATConnection & {
    _id: Types.ObjectId;
  })[]
>;
export function getConnections(type: 'sonar'): Promise<
  (SonarConnection & {
    _id: Types.ObjectId;
  })[]
>;
export function getConnections(): Promise<
  (Connection & {
    _id: Types.ObjectId;
  })[]
>;
export function getConnections(type?: Connection['type']) {
  if (!type) return ConnectionModel.find().lean();
  if (type === 'azure-pat') {
    return AzurePATConnectionModel.find().lean();
  }
  if (type === 'sonar') {
    return SonarConnectionModel.find().lean();
  }
}

export const getConnectionById = <T extends Connection>(id: Types.ObjectId | string) =>
  ConnectionModel.findOne({ _id: id }).lean() as Promise<T & { _id: Types.ObjectId }>;

export const createAzurePATConnection = (connection: Omit<AzurePATConnection, 'type'>) =>
  AzurePATConnectionModel.create(connection);

export const createSonarConnection = (connection: Omit<SonarConnection, 'type'>) =>
  SonarConnectionModel.create(connection);

export const modifyConnection = (connection: Connection & { _id: Types.ObjectId }) =>
  ConnectionModel.replaceOne({ _id: connection._id }, connection).lean();

export const deleteConnection = (id: Types.ObjectId | string) =>
  ConnectionModel.deleteOne({ _id: id }).lean();
