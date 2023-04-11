import type { ObjectId, Types } from 'mongoose';
import { model, Schema } from 'mongoose';
import type { Measure, SonarQualityGate } from '../../scraper/types-sonar.js';

export type SonarProject = {
  connectionId: ObjectId;
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
    connectionId: Schema.Types.ObjectId,
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

export const SonarAlertHistoryModel = model<SonarAlertHistory>(
  'SonarAlertHistory',
  sonarAlertHistorySchema
);
