import type { Types } from 'mongoose';
import { z } from 'zod';
import { getLanguageColor, normalizeBranchName, unique } from '../utils.js';
import { latestBuildReportsForRepoAndBranch } from './build-reports.js';
import { getConnections } from './connections.js';
import type { SonarMeasures, SonarProject } from './mongoose-models/sonar-models.js';
import {
  SonarAlertHistoryModel,
  SonarMeasuresModel,
  SonarProjectModel,
} from './mongoose-models/sonar-models.js';
import type { Measure, SonarQualityGateDetails } from '../scraper/types-sonar';
import type { QualityGateStatus } from '../../shared/types';
import { exists, oneDayInMs, oneWeekInMs } from '../../shared/utils.js';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { formatLoc } from '../scraper/stats-aggregators/code-quality.js';
import { getDefaultBranchAndNameForRepoIds } from './repos.js';

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
        projectName: {
          $toLower: { $replaceAll: { input: '$name', find: '-', replacement: '_' } },
        },
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
  return SonarMeasuresModel.aggregate<SonarMeasures>([
    { $match: { sonarProjectId: { $in: sonarProjectIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$sonarProjectId', first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);
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

  if (!sonarProjects || sonarProjects.length === 0) return null;

  const sonarProjectIds = sonarProjects.map(p => p._id);
  const [measures, sonarConnections] = await Promise.all([
    getLatestSonarMeasures(sonarProjectIds),
    getConnections('sonar'),
  ]);

  return measures
    .map(measure => {
      const { lastAnalysisDate, measureAsNumber, qualityGateMetric, qualityGateStatus } =
        getMeasureValue(measure.fetchDate, measure.measures);

      const sonarProject = sonarProjects.find(p => p._id.equals(measure.sonarProjectId));
      if (!sonarProject) return null;

      const sonarConnection = sonarConnections.find(sh =>
        sh._id.equals(sonarProject.connectionId)
      );
      if (!sonarConnection) return null;

      return {
        url: `${sonarConnection.url}/dashboard?id=${sonarProject.key}`,
        name: sonarProject.name,
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
          newBranchCoverage: qualityGateMetric('new_branch_coverage'),
          newDuplicatedLinesDensity: qualityGateMetric('new_duplicated_lines_density'),
          newBlockerViolations: qualityGateMetric('new_blocker_violations'),
          newBugs: qualityGateMetric('new_bugs'),
          newCriticalViolations: qualityGateMetric('new_critical_violations'),
          newMajorViolations: qualityGateMetric('new_major_violations'),
          newMinorViolations: qualityGateMetric('new_minor_violations'),
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
    })
    .filter(exists);
};

export const getSonarProjectsCount = async (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) => {
  const sonarProjects = await SonarAlertHistoryModel.aggregate<{
    totalProjects: number;
    passedProjects: number;
    projectsWithWarning: number;
    failedProjects: number;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
      },
    },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$sonarProjectId',
        latest: { $first: '$$ROOT' },
      },
    },
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        passedProjects: { $sum: { $cond: [{ $eq: ['$latest.value', 'OK'] }, 1, 0] } },
        projectsWithWarning: {
          $sum: { $cond: [{ $eq: ['$latest.value', 'WARN'] }, 1, 0] },
        },
        failedProjects: { $sum: { $cond: [{ $eq: ['$latest.value', 'ERROR'] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return sonarProjects[0] || { total: 0, totalOk: 0, totalWarn: 0, totalFailed: 0 };
};

const getSonarProjectIdsBeforeStartDate = async (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date
) => {
  const sonarProjectIdsBeforeStartDate = await SonarAlertHistoryModel.aggregate<{
    allProjectIds: string[];
    okProjectIds: string[];
    warnProjectIds: string[];
    failedProjectIds: string[];
  } | null>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
        date: { $lt: startDate },
      },
    },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: {
          repositoryId: '$repositoryId',
          sonarProjectId: '$sonarProjectId',
        },
        sonarProjectId: { $first: '$sonarProjectId' },
        latest: { $first: '$$ROOT' },
      },
    },
    {
      $group: {
        _id: null,
        allProjectIds: { $addToSet: { $toString: '$sonarProjectId' } },
        failedProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'ERROR'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        okProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'OK'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        warnProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'WARN'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        allProjectIds: {
          $filter: {
            input: '$allProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        okProjectIds: {
          $filter: {
            input: '$okProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        warnProjectIds: {
          $filter: {
            input: '$warnProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        failedProjectIds: {
          $filter: {
            input: '$failedProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
      },
    },
  ]);

  return sonarProjectIdsBeforeStartDate[0] || null;
};

const getWeeklySonarProjectIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return SonarAlertHistoryModel.aggregate<{
    weekIndex: number;
    allProjectIds: string[];
    okProjectIds: string[];
    warnProjectIds: string[];
    failedProjectIds: string[];
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
        date: inDateRange(startDate, endDate),
      },
    },
    {
      $addFields: {
        weekIndex: {
          $trunc: { $divide: [{ $subtract: ['$date', startDate] }, oneWeekInMs] },
        },
      },
    },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: {
          repositoryId: '$repositoryId',
          weekIndex: '$weekIndex',
          sonarProjectId: '$sonarProjectId',
        },
        sonarProjectId: { $first: '$sonarProjectId' },
        weekIndex: { $first: '$weekIndex' },
        latest: { $first: '$$ROOT' },
      },
    },
    {
      $group: {
        _id: '$weekIndex',
        weekIndex: { $first: '$weekIndex' },
        allProjectIds: { $addToSet: { $toString: '$sonarProjectId' } },
        failedProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'ERROR'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        okProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'OK'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        warnProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.value', 'WARN'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
      },
    },
    {
      $project: {
        weekIndex: 1,
        allProjectIds: {
          $filter: {
            input: '$allProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        okProjectIds: {
          $filter: {
            input: '$okProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        warnProjectIds: {
          $filter: {
            input: '$warnProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
        failedProjectIds: {
          $filter: {
            input: '$failedProjectIds',
            as: 'id',
            cond: { $ne: ['$$id', null] },
          },
        },
      },
    },
    { $sort: { weekIndex: 1 } },
  ]);
};

export const updateWeeklySonarProjectCount = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const [preStartDateSonarSummary, weeklySonarProjectIds] = await Promise.all([
    getSonarProjectIdsBeforeStartDate(collectionName, project, repositoryIds, startDate),
    getWeeklySonarProjectIds(queryContext, repositoryIds),
  ]);

  const passedProjectsSet = new Set(preStartDateSonarSummary?.okProjectIds || []);
  const warningProjectsSet = new Set(preStartDateSonarSummary?.warnProjectIds || []);
  const failedProjectsSet = new Set(preStartDateSonarSummary?.failedProjectIds || []);
  const allProjectsSet = new Set(preStartDateSonarSummary?.allProjectIds || []);
  const weeklyUpdatedStats = weeklySonarProjectIds.map(week => {
    week.allProjectIds.forEach(id => {
      allProjectsSet.add(id);
    });
    week.okProjectIds.forEach(id => {
      passedProjectsSet.add(id);
      warningProjectsSet.delete(id);
      failedProjectsSet.delete(id);
    });

    week.warnProjectIds.forEach(id => {
      warningProjectsSet.add(id);
      passedProjectsSet.delete(id);
      failedProjectsSet.delete(id);
    });

    week.failedProjectIds.forEach(id => {
      failedProjectsSet.add(id);
      passedProjectsSet.delete(id);
      warningProjectsSet.delete(id);
    });

    return {
      weekIndex: week.weekIndex,
      passedProjects: passedProjectsSet.size,
      projectsWithWarnings: warningProjectsSet.size,
      failedProjects: failedProjectsSet.size,
      totalProjects: allProjectsSet.size,
    };
  });

  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  return weeklyUpdatedStats.slice(totalIntervals - Math.floor(totalDays / 7));
};

export const getReposWithSonarQube = async (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) => {
  const ReposWithSonarQube = await SonarAlertHistoryModel.distinct('repositoryId', {
    collectionName,
    project,
    repositoryId: { $in: repositoryIds },
  });

  return ReposWithSonarQube.length;
};

export const getReposWithSonarQubeBeforeStartDate = (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date
) => {
  return SonarAlertHistoryModel.distinct('repositoryId', {
    collectionName,
    project,
    repositoryId: { $in: repositoryIds },
    date: { $lt: startDate },
  });
};

export const getWeeklyReposWithSonarQubeSummary = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return SonarAlertHistoryModel.aggregate<{
    weekIndex: number;
    repos: string[];
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
        date: inDateRange(startDate, endDate),
      },
    },
    {
      $addFields: {
        weekIndex: {
          $trunc: { $divide: [{ $subtract: ['$date', startDate] }, oneWeekInMs] },
        },
      },
    },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$weekIndex',
        weekIndex: { $first: '$weekIndex' },
        repos: { $addToSet: '$repositoryId' },
      },
    },
    { $project: { _id: 0 } },
    { $sort: { weekIndex: 1 } },
  ]);
};

export const updatedWeeklyReposWithSonarQubeCount = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const [preStartDateReposSummary, weeklyReposSummary] = await Promise.all([
    getReposWithSonarQubeBeforeStartDate(
      collectionName,
      project,
      repositoryIds,
      startDate
    ),
    getWeeklyReposWithSonarQubeSummary(queryContext, repositoryIds),
  ]);

  const reposSet = new Set(preStartDateReposSummary);

  const weeklyUpdatedStats = weeklyReposSummary.map(week => {
    week.repos.forEach(id => {
      reposSet.add(id);
    });

    return {
      weekIndex: week.weekIndex,
      count: reposSet.size,
    };
  });

  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  return weeklyUpdatedStats.slice(totalIntervals - Math.floor(totalDays / 7));
};

export const getSonarQualityGateStatusForRepoName = async (
  collectionName: string,
  project: string,
  repositoryName: string,
  defaultBranch: string
) => {
  const sonarProjects = await getMatchingSonarProjects(
    repositoryName,
    defaultBranch,
    latestBuildReportsForRepoAndBranch(collectionName, project)
  );

  if (!sonarProjects || sonarProjects.length === 0) return null;

  const sonarProjectIds = sonarProjects.map(p => p._id);
  const [measures, sonarConnections] = await Promise.all([
    getLatestSonarMeasures(sonarProjectIds),
    getConnections('sonar'),
  ]);

  return measures
    .map(measure => {
      const { qualityGateStatus } = getMeasureValue(measure.fetchDate, measure.measures);

      const sonarProject = sonarProjects.find(p => p._id.equals(measure.sonarProjectId));
      if (!sonarProject) return null;

      const sonarConnection = sonarConnections.find(sh =>
        sh._id.equals(sonarProject.connectionId)
      );
      if (!sonarConnection) return null;

      return {
        url: `${sonarConnection.url}/dashboard?id=${sonarProject.key}`,
        name: sonarProject.name,
        nonCommentLinesOfCode: measure.measures.find(m => m.metric === 'ncloc')?.value,
        language:
          formatLoc(
            measure.measures.find(m => m.metric === 'ncloc_language_distribution')?.value
          ) || null,
        quality: {
          gate: qualityGateStatus,
        },
      };
    })
    .filter(exists);
};

const combineCodeStats = (
  language: {
    stats:
      | {
          lang: string;
          loc: number;
        }[]
      | null;
    ncloc: string | undefined;
  }[]
) => {
  if (language.length === 0) return null;

  const stats = language.reduce<{
    ncloc: number;
    stats: {
      lang: string;
      loc: number;
      color: string | undefined;
    }[];
  }>(
    (acc, curr) => {
      if (curr.stats !== null) {
        acc.ncloc += Number(curr.ncloc);

        curr.stats.forEach(stat => {
          const existingStat = acc.stats.find(s => s.lang === stat.lang);
          if (existingStat) {
            existingStat.loc += stat.loc;
          } else {
            acc.stats.push({ ...stat, color: getLanguageColor(stat.lang) });
          }
        });
      }
      return acc;
    },
    { ncloc: 0, stats: [] }
  );

  return {
    ncloc: stats.ncloc,
    stats: stats.stats.sort((a, b) => b.loc - a.loc),
  };
};

export const getSonarQualityGateStatusForRepoIds = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const repositories = await getDefaultBranchAndNameForRepoIds(
    queryContext,
    repositoryIds
  );

  return Promise.all(
    repositories.map(async repo => {
      const qualityGates = repo.defaultBranch
        ? await getSonarQualityGateStatusForRepoName(
            collectionName,
            project,
            repo.name,
            repo.defaultBranch
          )
        : null;

      if (!qualityGates) {
        return {
          repositoryId: repo.id,
          status: null,
          language: null,
        };
      }

      const status = qualityGates.map(qg => qg.quality.gate);

      const language = qualityGates.map(qg => ({
        stats: qg.language,
        ncloc: qg.nonCommentLinesOfCode,
      }));

      return {
        repositoryId: repo.id,
        status,
        language: combineCodeStats(language),
      };
    })
  );
};
