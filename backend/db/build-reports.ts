import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export type AzureBuildReport = {
  collectionName: string;
  collectionId: string;
  project: string;
  repo: string;
  repoId: string;
  branch: string;
  branchName: string;
  buildId: string;
  buildDefinitionId: string;
  buildReason:
  | 'Manual' | 'IndividualCI' | 'BatchedCI' | 'Schedule' | 'ValidateShelveset'
  | 'CheckInShelveset' | 'PullRequest' | 'ResourceTrigger';
  buildScript?: string;
  usesCentralTemplate?: boolean;
  sonarHost?: string;
  sonarProjectKey?: string;
};

const azureBuildReportSchema = new Schema<AzureBuildReport>({
  collectionName: { type: String, required: true },
  collectionId: { type: String, required: true },
  project: { type: String, required: true },
  repo: { type: String, required: true },
  repoId: { type: String, required: true },
  branch: { type: String, required: true },
  branchName: { type: String, required: true },
  buildId: { type: String, required: true },
  buildDefinitionId: { type: String, required: true },
  buildReason: { type: String, required: true },
  buildScript: { type: String },
  usesCentralTemplate: Boolean,
  sonarHost: String,
  sonarProjectKey: String
}, {
  timestamps: true
});

azureBuildReportSchema.index({
  collection: 1,
  project: 1,
  buildId: 1
});

const AzureBuildReportModel = model<AzureBuildReport>('AzureBuildReport', azureBuildReportSchema);

export const saveBuildReport = (report: AzureBuildReport) => (
  AzureBuildReportModel.updateOne(
    {
      collectionName: report.collectionName,
      project: report.project,
      buildId: report.buildId
    },
    {
      $set: {
        repo: report.repo,
        branch: report.branch,
        branchName: report.branchName,
        buildDefinitionId: report.buildDefinitionId,
        buildReason: report.buildReason,
        buildScript: report.buildScript,
        ...(report.sonarHost ? {
          sonarHost: report.sonarHost,
          sonarProjectKey: report.sonarProjectKey
        } : {})
      }
    },
    { upsert: true }
  )
);
