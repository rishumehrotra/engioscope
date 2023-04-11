import type { Types } from 'mongoose';
import { z } from 'zod';
import { normalizeBranchName, unique } from '../utils.js';
import { latestBuildReportsForRepoAndBranch } from './build-reports.js';
import { getConnections } from './connections.js';
import type { SonarProject } from './mongoose-models/sonar-models.js';
import { SonarMeasuresModel, SonarProjectModel } from './mongoose-models/sonar-models.js';
import type { Measure, SonarQualityGateDetails } from '../scraper/types-sonar';
import type { QualityGateStatus } from '../../shared/types';

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
  const projects = await SonarProjectModel.aggregate<
    SonarProject & { _id: Types.ObjectId }
  >([
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
  const projects = await SonarProjectModel.aggregate<
    SonarProject & { _id: Types.ObjectId }
  >([
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
): Promise<(SonarProject & { _id: Types.ObjectId })[] | null> => {
  const sonarProjectsFromBuildReports = await attemptMatchFromBuildReports(
    repoName,
    defaultBranch,
    parseReports
  );
  return sonarProjectsFromBuildReports || attemptMatchByRepoName(repoName);
};

export const getLatestSonarMeasures = async (sonarProjectIds: Types.ObjectId[]) => {
  const measures = await SonarMeasuresModel.aggregate([
    { $match: { sonarProjectId: { $in: sonarProjectIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$sonarProjectId', first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);
  return measures;
};

const isMeasureName = (name: string) => (measure: Measure) => measure.metric === name;

const parseQualityGateStatus = (gateLabel?: string): QualityGateStatus => {
  switch (gateLabel) {
    case 'OK': {
      return 'pass';
    }
    case 'WARN': {
      return 'warn';
    }
    case 'ERROR': {
      return 'fail';
    }
    default: {
      return 'unknown';
    }
  }
};

const getMeasureValue = (fetchDate: Date, measures: Measure[]) => {
  const findMeasure = (name: string) => measures.find(isMeasureName(name))?.value;

  const measureAsNumber = (name: string) => {
    const measure = findMeasure(name);
    return measure ? Number(measure) : undefined;
  };

  const qualityGateDetails = JSON.parse(
    findMeasure('quality_gate_details') || '{}'
  ) as SonarQualityGateDetails;

  const qualityGateMetric = (metricName: string) => {
    const metric = qualityGateDetails.conditions?.find(
      ({ metric }) => metric === metricName
    );

    if (!metric) return;

    return {
      value: metric?.actual ? Number(metric.actual) : undefined,
      op: metric?.op ? (metric.op.toLowerCase() as 'gt' | 'lt') : undefined,
      level: metric?.error ? Number(metric.error) : undefined,
      status: parseQualityGateStatus(metric.level),
    };
  };

  return {
    // url,
    // name,
    lastAnalysisDate: fetchDate,
    measureAsNumber,
    qualityGateMetric,
    qualityGateStatus: parseQualityGateStatus(qualityGateDetails.level),
  };
};

export const RepoSonarMeasuresInputParser = z.object({
  collectionName: z.string(),
  project: z.string(),
  repositoryName: z.string(),
  defaultBranch: z.string().optional(),
});

export const getRepoSonarMeasures = async ({
  collectionName,
  project,
  repositoryName,
  defaultBranch,
}: z.infer<typeof RepoSonarMeasuresInputParser>) => {
  const sonarProjects = await getMatchingSonarProjects(
    repositoryName,
    defaultBranch,
    latestBuildReportsForRepoAndBranch(collectionName, project)
  );

  if (sonarProjects && sonarProjects.length > 0) {
    const sonarProjectIds = sonarProjects.map(p => p._id);
    const measuresData = await getLatestSonarMeasures(sonarProjectIds);
    const sonarHosts = await getConnections('sonar');

    return measuresData.map(measure => {
      const { lastAnalysisDate, measureAsNumber, qualityGateMetric, qualityGateStatus } =
        getMeasureValue(measure.fetchDate, measure.measures);

      const sonarProject = sonarProjects.find(
        p => p._id.toString() === measure.sonarProjectId.toString()
      );

      const sonarHost = sonarProject?.connectionId
        ? sonarHosts.find(
            sh => sh._id.toString() === sonarProject.connectionId.toString()
          )?.url
        : 'http://#';

      return {
        url: `${sonarHost}/dashboard?id=${sonarProject?.key}`,
        name: sonarProject ? sonarProject.name : measure.sonarProjectId,
        lastAnalysisDate,
        // qualityGateName: sonarAnalysis.qualityGateName,
        files: measureAsNumber('files'),
        complexity: {
          cyclomatic: measureAsNumber('complexity'),
          cognitive: measureAsNumber('cognitive_complexity'),
        },
        quality: {
          gate: qualityGateStatus,
          securityRating: qualityGateMetric('security_rating'),
          coverage: qualityGateMetric('coverage'),
          duplicatedLinesDensity: qualityGateMetric('duplicated_lines_density'),
          blockerViolations: qualityGateMetric('blocker_violations'),
          codeSmells: qualityGateMetric('code_smells'),
          criticalViolations: qualityGateMetric('critical_violations'),
        },
        coverage: {
          byTests: measureAsNumber('coverage'),
          line: measureAsNumber('line_coverage'),
          linesToCover: measureAsNumber('lines_to_cover'),
          uncoveredLines: measureAsNumber('uncovered_lines'),
          branch: measureAsNumber('branch_coverage'),
          conditionsToCover: measureAsNumber('conditions_to_cover'),
          uncoveredConditions: measureAsNumber('uncovered_conditions'),
        },
        reliability: {
          rating: measureAsNumber('reliability_rating'),
          bugs: measureAsNumber('bugs'),
        },
        security: {
          rating: measureAsNumber('security_rating'),
          vulnerabilities: measureAsNumber('vulnerabilities'),
        },
        duplication: {
          blocks: measureAsNumber('duplicated_blocks'),
          files: measureAsNumber('duplicated_files'),
          lines: measureAsNumber('duplicated_lines'),
          linesDensity: measureAsNumber('duplicated_lines_density'),
        },
        maintainability: {
          rating: measureAsNumber('sqale_rating'),
          techDebt: measureAsNumber('sqale_index'),
          codeSmells: measureAsNumber('code_smells'),
        },
        // oldestFoundSample: head(
        //   sonarAnalysis.qualityGateHistory.sort(desc(byDate(prop('date'))))
        // )?.date.toISOString(),
        // qualityGateByWeek: uptillWeeks.map(isUptillWeek => {
        //   const latestInWeek = head(
        //     sonarAnalysis.qualityGateHistory
        //       .filter(({ date }) => isUptillWeek(date))
        //       .sort(desc(byDate(prop('date'))))
        //   );

        //   return latestInWeek ? parseQualityGateStatus(latestInWeek.value) : null;
        // }),
      };
    });
  }
  return null;
};
