import type { ObjectId, Schema } from 'mongoose';
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

/* eslint-disable no-redeclare */
export function getConnections(type: 'azure-pat'): Promise<
  (AzurePATConnection & {
    _id: Schema.Types.ObjectId;
  })[]
>;
export function getConnections(type: 'sonar'): Promise<
  (SonarConnection & {
    _id: Schema.Types.ObjectId;
  })[]
>;
export function getConnections(): Promise<
  (Connection & {
    _id: Schema.Types.ObjectId;
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
/* eslint-enable */

export const getConnectionById = (id: ObjectId | string) =>
  ConnectionModel.findOne({ _id: id }).lean();

export const createAzurePATConnection = (connection: Omit<AzurePATConnection, 'type'>) =>
  AzurePATConnectionModel.create(connection);

export const createSonarConnection = (connection: Omit<SonarConnection, 'type'>) =>
  SonarConnectionModel.create(connection);

export const modifyConnection = (connection: Connection & { _id: ObjectId }) =>
  ConnectionModel.replaceOne({ _id: connection._id }, connection).lean();

export const deleteConnection = (id: ObjectId | string) =>
  ConnectionModel.deleteOne({ _id: id }).lean();
