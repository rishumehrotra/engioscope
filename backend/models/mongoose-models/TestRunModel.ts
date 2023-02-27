import { model, Schema } from 'mongoose';
import type { TestCaseResultOutcome } from '../../scraper/types-azure.js';

export type TestRun = {
  collectionName: string;
  project: { id: string; name: string };
  id: number;
  name: string;
  url: string;
  buildConfiguration: {
    id: number;
    number: string;
    platform: string;
    buildDefinitionId: number;
    project: {
      name: string;
    };
  };
  startedDate: Date;
  completedDate: Date;
  state:
    | 'Unspecified'
    | 'NotStarted'
    | 'InProgress'
    | 'Completed'
    | 'Waiting'
    | 'Aborted'
    | 'NeedsInvestigation';
  totalTests: number;
  revision: number;
  release?: {
    id: number;
    name: string | null;
    environmentId: number;
    environmentName: null | string;
    definitionId: number;
    environmentDefinitionId: number;
    environmentDefinitionName: null | string;
  };
  webAccessUrl: string;
  runStatistics: { state: string; outcome: TestCaseResultOutcome; count: number }[];
};

const testSchema = new Schema<TestRun>(
  {
    collectionName: { type: String, required: true },
    id: { type: Number, required: true },
    name: { type: String },
    url: { type: String, required: true },
    buildConfiguration: {
      id: { type: Number },
      number: { type: String },
      platform: { type: String },
      buildDefinitionId: { type: Number },
      project: {
        name: { type: String },
      },
    },
    project: {
      id: { type: String },
      name: { type: String },
    },
    startedDate: { type: Date, required: true },
    completedDate: { type: Date, required: true },
    state: { type: String },
    totalTests: { type: Number, required: true },
    revision: { type: Number },
    release: {
      id: { type: Number },
      name: { type: String },
      environmentId: { type: Number },
      environmentName: { type: String },
      definitionId: { type: Number },
      environmentDefinitionId: { type: Number },
      environmentDefinitionName: { type: String },
    },
    webAccessUrl: { type: String },
    runStatistics: [
      {
        state: { type: String },
        outcome: { type: String },
        count: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

testSchema.index({
  'collectionName': 1,
  'project.name': 1,
  'buildConfiguration.buildDefinitionId': 1,
});

export const TestRunModel = model<TestRun>('TestRun', testSchema);
