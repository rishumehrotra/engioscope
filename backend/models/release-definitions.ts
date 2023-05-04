import { model, Schema } from 'mongoose';
import pMemoize from 'p-memoize';
import ExpiryMap from 'expiry-map';
import { oneMinuteInMs } from '../../shared/utils.js';

export type ReleaseCondition = {
  conditionType: 'artifact' | 'environmentState' | 'event' | 'undefined';
  name: string;
  value: string;
};

export type ReleaseDefinitionEnvironment = {
  // Many properties have been skipped
  // https://learn.microsoft.com/en-us/rest/api/azure/devops/release/definitions/list?view=azure-devops-rest-5.1&tabs=HTTP#releasedefinitionenvironment
  id: number;
  name: string;
  rank: number;
  badgeUrl: string;
  conditions: ReleaseCondition[];
};

export type ReleaseDefinition = {
  collectionName: string;
  project: string;
  source: 'ibiza' | 'portalExtensionApi' | 'restApi' | 'undefined' | 'userInterface';
  revision: number;
  description?: string;
  createdById: string;
  createdOn: Date;
  modifiedById: string;
  modifiedOn: Date;
  isDeleted: boolean;
  environments: ReleaseDefinitionEnvironment[];
  releaseNameFormat: string;
  id: number;
  name: string;
  path: string;
  url: string;
};

const releaseDefinitionSchema = new Schema<ReleaseDefinition>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  id: { type: Number, required: true },
  source: { type: String, required: true },
  revision: { type: Number, required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  createdById: { type: String, required: true },
  createdOn: { type: Date, required: true },
  modifiedById: { type: String },
  modifiedOn: { type: Date },
  isDeleted: { type: Boolean, required: true },
  releaseNameFormat: { type: String, required: true },
  environments: [
    {
      id: { type: Number },
      name: { type: String },
      rank: { type: Number },
      ownerId: { type: String },
      badgeUrl: { type: String },
      conditions: [
        {
          conditionType: { type: String },
          name: { type: String },
          value: { type: String },
        },
      ],
    },
  ],
});

releaseDefinitionSchema.index({ collectionName: 1, project: 1, id: 1 }, { unique: true });

export const ReleaseDefinitionModel = model<ReleaseDefinition>(
  'ReleaseDefinition',
  releaseDefinitionSchema
);

export const getReleaseEnvironments = (
  collectionName: string,
  project: string,
  definitionId: number
) =>
  ReleaseDefinitionModel.findOne(
    { collectionName, project, id: definitionId },
    { environments: 1 }
  )
    .lean()
    .then(r => r?.environments);

const searchClause = (searchTerm?: string) => {
  if (!searchTerm) return {};
  if (/^repo:"(.*)"$/.test(searchTerm)) return {}; // If this is a repo search, skip other factors

  return {
    $or: [
      { name: { $regex: new RegExp(searchTerm, 'i') } },
      { 'environments.name': { $regex: new RegExp(searchTerm, 'i') } },
    ],
  };
};

const getMinimalReleaseDefinitionsInner = async (
  collectionName: string,
  project: string,
  searchTerm?: string,
  stageNameContaining?: string
) => {
  return ReleaseDefinitionModel.find(
    {
      collectionName,
      project,
      ...searchClause(searchTerm),
      ...(stageNameContaining
        ? { 'environments.name': { $regex: new RegExp(stageNameContaining, 'i') } }
        : {}),
    },
    { name: 1, id: 1, url: 1 }
  ).lean() as unknown as Promise<Pick<ReleaseDefinition, 'id' | 'name' | 'url'>[]>;
};

const cache = new ExpiryMap(5 * oneMinuteInMs);
export const getMinimalReleaseDefinitions = pMemoize(getMinimalReleaseDefinitionsInner, {
  cacheKey: x => JSON.stringify(x),
  cache,
});
