import { normalizeBranchName, unique } from '../utils.js';
import type { latestBuildReportsForRepoAndBranch } from './build-reports.js';
import { getConnections } from './connections.js';
import type { SonarProject } from './mongoose-models/sonar-models.js';
import { SonarProjectModel } from './mongoose-models/sonar-models.js';

export const attemptMatchFromBuildReports = async (
  repoName: string,
  defaultBranch: string | undefined,
  parseReports: ReturnType<typeof latestBuildReportsForRepoAndBranch>
) => {
  if (!defaultBranch) return null;

  const buildReports = await parseReports(
    repoName,
    defaultBranch ? normalizeBranchName(defaultBranch) : 'master'
  );

  if (!buildReports.length) return null;

  const sonarUrls = unique(buildReports.map(report => report.sonarHost?.toLowerCase()));
  const sonarServers = (await getConnections('sonar')).filter(s =>
    sonarUrls.includes(s.url.toLowerCase())
  );

  const matchingSonarProjects = await SonarProjectModel.find({
    $or: sonarServers.map(s => {
      return {
        connectionId: s._id,
        key: buildReports
          .filter(br => br.sonarHost?.toLowerCase() === s.url.toLowerCase())
          .map(br => br.sonarProjectKey),
      };
    }),
  }).lean();

  return matchingSonarProjects.length ? matchingSonarProjects : null;
};

const attemptExactMatchFind = async (repoName: string) => {
  const projects = await SonarProjectModel.aggregate<SonarProject>([
    { $match: { lastAnalysisDate: { $exists: true } } },
    {
      $addFields: {
        projectName: { $replaceAll: { input: '$name', find: '-', replacement: '_' } },
      },
    },
    { $match: { projectName: repoName.replace(/-/g, '_').toLowerCase() } },
    { $unset: 'projectName' },
    { $sort: { lastAnalysisDate: -1 } },
    { $group: { _id: null, first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);

  return projects.length > 0 ? [projects[0]] : null;
};

const attemptStartsWithFind = async (repoName: string) => {
  const projects = await SonarProjectModel.aggregate<SonarProject>([
    { $match: { lastAnalysisDate: { $exists: true } } },
    {
      $addFields: {
        projectName: { $replaceAll: { input: '$name', find: '-', replacement: '_' } },
      },
    },
    {
      $match: {
        projectName: {
          $regex: new RegExp(`^${repoName.replace(/-/g, '_').toLowerCase()}`, 'i'),
        },
      },
    },
    { $unset: 'projectName' },
    { $sort: { lastAnalysisDate: -1 } },
  ]);

  return projects.length > 0 ? projects : null;
};

const attemptMatchByRepoName = async (repoName: string) =>
  (await attemptExactMatchFind(repoName)) || attemptStartsWithFind(repoName);

export const getMatchingSonarProjects = async (
  repoName: string,
  defaultBranch: string | undefined,
  parseReports: ReturnType<typeof latestBuildReportsForRepoAndBranch>
) => {
  const sonarProjectsFromBuildReports = await attemptMatchFromBuildReports(
    repoName,
    defaultBranch,
    parseReports
  );
  return sonarProjectsFromBuildReports || attemptMatchByRepoName(repoName);
};
