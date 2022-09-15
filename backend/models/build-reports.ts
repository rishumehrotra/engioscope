import mongoose from 'mongoose';
import { map } from 'rambda';
import yaml from 'yaml';

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
  buildScript: string | undefined;
  templateRepo: string | undefined;
  sonarHost: string | undefined;
  sonarProjectKey: string | undefined;
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
  templateRepo: String,
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

const templateRepo = (buildScript: AzureBuildReport['buildScript']) => {
  if (!buildScript) return;

  const parsed = yaml.parse(buildScript);
  const possibleTemplate = (parsed.template as string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    || parsed.stages?.find((s: any) => s.template)?.template as string | undefined;
  if (!possibleTemplate) return;

  const parts = possibleTemplate.split('@');
  if (parts.length > 1) return parts[1];
  return possibleTemplate;
};

export const saveBuildReport = (report: Omit<AzureBuildReport, 'templateRepo'>) => (
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
        ...(report.buildScript ? {
          templateRepo: templateRepo(report.buildScript)
        } : {}),
        ...(report.sonarHost ? {
          sonarHost: report.sonarHost,
          sonarProjectKey: report.sonarProjectKey
        } : {})
      }
    },
    { upsert: true }
  )
);

export const latestBuildReportsForRepoAndBranch = (collectionName: string, project: string) => (
  (repo: string, branchName: string) => (
    AzureBuildReportModel.aggregate([
      {
        $match: {
          collectionName, project, repo, branchName
        }
      },
      {
        $group: {
          _id: '$buildId',
          latestDate: {
            $max: {
              $mergeObjects: [{ updatedAt: '$updatedAt' }, '$$ROOT']
            }
          }
        }
      }
    ])
      .exec()
      .then(map(r => r.latestDate as AzureBuildReport))
  )
);
