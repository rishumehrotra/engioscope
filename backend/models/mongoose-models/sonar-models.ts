import { model, Schema, Types } from 'mongoose';
import type { Measure, SonarQualityGate } from '../../scraper/types-sonar.js';

export type SonarProject = {
  connectionId: Types.ObjectId;
  organization?: string;
  id?: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: Date;
};

const sonarProjectSchema = new Schema<SonarProject>(
  {
    connectionId: Types.ObjectId,
    organization: String,
    id: String,
    key: { type: String, required: true },
    name: { type: String, required: true },
    qualifier: { type: String, required: true },
    visibility: { type: String, required: true },
    lastAnalysisDate: Date,
  },
  { timestamps: true }
);

sonarProjectSchema.index({
  connectionId: 1,
  key: 1,
});

export const SonarProjectModel = model<SonarProject>('SonarProject', sonarProjectSchema);

export type SonarMeasures = {
  sonarProjectId: Types.ObjectId;
  fetchDate: Date;
  measures: Measure[];
};

const sonarMeasuresSchema = new Schema<SonarMeasures>({
  sonarProjectId: Schema.Types.ObjectId,
  fetchDate: Date,
  measures: [
    {
      metric: { type: String, required: true },
      value: { type: String, required: true },
    },
  ],
});

sonarMeasuresSchema.index({
  sonarProjectId: 1,
  fetchDate: 1,
});

export const SonarMeasuresModel = model<SonarMeasures>(
  'SonarMeasures',
  sonarMeasuresSchema
);

export type SonarAlertHistory = {
  collectionName: string;
  project: string;
  repositoryId: string;
  sonarProjectId: Types.ObjectId;
  date: Date;
  value: SonarQualityGate;
};

const sonarAlertHistorySchema = new Schema<SonarAlertHistory>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repositoryId: { type: String, required: true },
  sonarProjectId: { type: Schema.Types.ObjectId, required: true },
  date: { type: Date, required: true },
  value: { type: String, required: true },
});

sonarAlertHistorySchema.index({
  collectionName: 1,
  project: 1,
  sonarProjectId: 1,
});

export const SonarAlertHistoryModel = model<SonarAlertHistory>(
  'SonarAlertHistory',
  sonarAlertHistorySchema
);

export type SonarQualityGateUsed = {
  collectionName: string;
  project: string;
  repositoryId: string;
  sonarProjectId: Types.ObjectId;
  name: string;
  id: string;
  default: boolean;
  updatedAt: Date;
};

const sonarQualityGateUsedSchema = new Schema<SonarQualityGateUsed>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repositoryId: { type: String, required: true },
  sonarProjectId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  id: { type: String, required: true },
  default: { type: Boolean },
  updatedAt: { type: Date, requred: true },
});

sonarQualityGateUsedSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
});

export const SonarQualityGateUsedModel = model<SonarQualityGateUsed>(
  'SonarQualityGateUsed',
  sonarQualityGateUsedSchema
);

export type SonarProjectsForRepo = {
  collectionName: string;
  project: string;
  repositoryId: string;
  sonarProjectIds: Types.ObjectId[];
};

const sonarProjectsForRepoSchema = new Schema<SonarProjectsForRepo>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repositoryId: { type: String, required: true },
  sonarProjectIds: [{ type: Schema.Types.ObjectId, required: true }],
});

sonarProjectsForRepoSchema.index({
  collectionName: 1,
  project: 1,
  repositoryId: 1,
});

export const SonarProjectsForRepoModel = model<SonarProjectsForRepo>(
  'SonarProjectsForRepo',
  sonarProjectsForRepoSchema
);
