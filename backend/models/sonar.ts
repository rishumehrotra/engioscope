import type { Types } from 'mongoose';
import { z } from 'zod';
import { range } from 'rambda';
import { byNum, desc } from 'sort-lib';
import { createIntervals, unique } from '../utils.js';
import { latestBuildReportsForRepo } from './build-reports.js';
import { getConnections } from './connections.js';
import type { SonarMeasures, SonarProject } from './mongoose-models/sonar-models.js';
import {
  SonarProjectsForRepoModel,
  SonarQualityGateUsedModel,
  SonarAlertHistoryModel,
  SonarMeasuresModel,
  SonarProjectModel,
} from './mongoose-models/sonar-models.js';
import type { Measure, SonarQualityGateDetails } from '../scraper/types-sonar';
import type { QualityGateStatus } from '../../shared/types';
import {
  capitalizeFirstLetter,
  exists,
  oneWeekInMs,
  weightedQualityGate,
} from '../../shared/utils.js';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { fromContext } from './utils.js';
import { formatLoc } from '../scraper/stats-aggregators/code-quality.js';
import { getDefaultBranchAndNameForRepoIds } from './repos.js';
import { RepositoryModel } from './mongoose-models/RepositoryModel.js';
import { getLanguageColor } from '../language-colors.js';
import { getActiveRepos, type filteredReposInputParser } from './active-repos.js';

export const lastAlertHistoryFetchDate = async (options: {
  collectionName: string;
  project: string;
  repositoryId: string;
  sonarProjectId: string;
}) => {
  const matchingHistoryEntry = await SonarAlertHistoryModel.findOne(
    options,
    { date: 1 },
    { sort: { date: -1 } }
  );

  return matchingHistoryEntry?.date;
};

export const attemptMatchFromBuildReports = async (
  repoName: string,
  parseReports: ReturnType<typeof latestBuildReportsForRepo>
) => {
  const buildReports = await parseReports(repoName);

  if (!buildReports.length) return null;

  const sonarUrls = unique(buildReports.map(report => report.sonarHost?.toLowerCase()));
  const sonarServers = (await getConnections('sonar')).filter(s =>
    sonarUrls.includes(s.url.toLowerCase())
  );

  if (!sonarServers.length) return null;

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
    { $match: { projectName: repoName.replaceAll('-', '_').toLowerCase() } },
    { $unset: 'projectName' },
    { $sort: { lastAnalysisDate: -1 } },
    { $group: { _id: null, first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);

  return projects.length > 0 ? [projects[0]] : [];
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
          $regex: new RegExp(`^${repoName.replaceAll('-', '_').toLowerCase()}`, 'i'),
        },
      },
    },
    { $unset: 'projectName' },
    { $sort: { lastAnalysisDate: -1 } },
  ]);

  return projects.length > 0 ? projects : [];
};

const attemptMatchByRepoName = async (repoName: string) =>
  (await attemptExactMatchFind(repoName)) || attemptStartsWithFind(repoName);

export const matchingSonarProjectsForRepo = async (
  collectionName: string,
  project: string,
  repoId: string
): Promise<(SonarProject & { _id: Types.ObjectId })[]> => {
  const repo = await RepositoryModel.findOne(
    {
      collectionName,
      'project.name': project,
      'id': repoId,
    },
    { name: 1 }
  ).lean();

  if (!repo) return [];

  const sonarProjectsFromBuildReports = await attemptMatchFromBuildReports(
    repo.name,
    latestBuildReportsForRepo(collectionName, project)
  );

  return sonarProjectsFromBuildReports || attemptMatchByRepoName(repo.name);
};

const getSonarProjectIdsForRepo = async (
  collectionName: string,
  project: string,
  repoId: string
): Promise<Types.ObjectId[]> => {
  return SonarProjectsForRepoModel.findOne(
    {
      collectionName,
      project,
      repositoryId: repoId,
    },
    { sonarProjectIds: 1 }
  )
    .lean()
    .then(x => x?.sonarProjectIds || []);
};

const getLatestSonarMeasures = async (sonarProjectIds: Types.ObjectId[]) => {
  return SonarMeasuresModel.aggregate<SonarMeasures>([
    { $match: { sonarProjectId: { $in: sonarProjectIds } } },
    { $sort: { fetchDate: -1 } },
    { $group: { _id: '$sonarProjectId', first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);
};

const getLatestSonarAlertHistory = async (
  collectionName: string,
  project: string,
  sonarProjectIds: Types.ObjectId[]
) => {
  return SonarAlertHistoryModel.aggregate<{
    repositoryId: string;
    sonarProjectId: Types.ObjectId;
    date: Date;
  }>([
    { $match: { collectionName, project, sonarProjectId: { $in: sonarProjectIds } } },
    { $sort: { date: -1 } },
    { $group: { _id: '$sonarProjectId', first: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$first' } },
  ]);
};

const getSonarQualityGatesUsed = async (
  collectionName: string,
  project: string,
  repositoryId: string,
  sonarProjectIds: Types.ObjectId[]
) => {
  return SonarQualityGateUsedModel.aggregate<{
    repositoryId: string;
    sonarProjectId: Types.ObjectId;
    name: string;
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId,
        sonarProjectId: { $in: sonarProjectIds },
      },
    },
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
  repositoryId: z.string(),
  defaultBranch: z.string().optional(),
});

export const sonarProjectsForIds = async (sonarProjectIds: Types.ObjectId[]) => {
  const sonarProjects = await SonarProjectModel.find({
    _id: { $in: sonarProjectIds },
  }).lean();

  return (sonarProjectId?: Types.ObjectId) => {
    if (!sonarProjectId) return;
    return sonarProjects.find(p => p._id.equals(sonarProjectId));
  };
};

export const getSonarProjectsForRepoIds = async (
  collectionName: string,
  project: string,
  repoIds: string[]
) => {
  const sonarProjectIdsForRepoIds = await Promise.all(
    repoIds.map(async repoId => {
      const sonarProjectIds = await getSonarProjectIdsForRepo(
        collectionName,
        project,
        repoId
      );

      if (!sonarProjectIds) {
        return null;
      }
      return { repoId, sonarProjectIds };
    })
  ).then(x => x.filter(exists));

  const sonarProjectsById = await sonarProjectsForIds(
    sonarProjectIdsForRepoIds.flatMap(p => p.sonarProjectIds)
  );

  return sonarProjectIdsForRepoIds
    .flatMap(({ repoId, sonarProjectIds }) =>
      sonarProjectIds.map(p => {
        const sonarProject = sonarProjectsById(p);
        if (!sonarProject) {
          return;
        }
        return { repoId, sonarProject };
      })
    )
    .filter(exists);
};

export const getRepoSonarMeasures = async ({
  collectionName,
  project,
  repositoryId,
}: z.infer<typeof RepoSonarMeasuresInputParser>) => {
  const sonarProjectIds = await getSonarProjectIdsForRepo(
    collectionName,
    project,
    repositoryId
  );

  if (!sonarProjectIds.length) return [];

  const [measures, sonarConnections, sonarAlert, sonarQualityGates, sonarProjectById] =
    await Promise.all([
      getLatestSonarMeasures(sonarProjectIds),
      getConnections('sonar'),
      getLatestSonarAlertHistory(collectionName, project, sonarProjectIds),
      getSonarQualityGatesUsed(collectionName, project, repositoryId, sonarProjectIds),
      sonarProjectsForIds(sonarProjectIds),
    ]);

  return measures
    .map(measure => {
      const latestSonarAlertDate =
        sonarAlert.find(a => a.sonarProjectId.equals(measure.sonarProjectId))?.date ||
        null;

      const qualityGateName =
        sonarQualityGates.find(s => s.sonarProjectId.equals(measure.sonarProjectId))
          ?.name || null;

      const { measureAsNumber, qualityGateMetric, qualityGateStatus } = getMeasureValue(
        measure.fetchDate,
        measure.measures
      );

      const sonarProject = sonarProjectById(
        sonarProjectIds.find(p => p._id.equals(measure.sonarProjectId))
      );

      if (!sonarProject) return null;

      const sonarConnection = sonarConnections.find(sh =>
        sh._id.equals(sonarProject.connectionId)
      );
      if (!sonarConnection) return null;

      return {
        url: `${sonarConnection.url}/dashboard?id=${sonarProject.key}`,
        name: sonarProject.name,
        lastAnalysisDate: latestSonarAlertDate,
        qualityGateName,
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
      };
    })
    .filter(exists);
};

export const getSonarProjectsCount = async (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) => {
  // const sonarProjects = await SonarAlertHistoryModel.aggregate<{
  //   totalProjects: number;
  //   passedProjects: number;
  //   projectsWithWarning: number;
  //   failedProjects: number;
  // }>([
  //   {
  //     $match: {
  //       collectionName,
  //       project,
  //       repositoryId: { $in: repositoryIds },
  //     },
  //   },
  //   { $sort: { date: -1 } },
  //   {
  //     $group: {
  //       _id: '$sonarProjectId',
  //       latest: { $first: '$$ROOT' },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: null,
  //       totalProjects: { $sum: 1 },
  //       passedProjects: { $sum: { $cond: [{ $eq: ['$latest.value', 'OK'] }, 1, 0] } },
  //       projectsWithWarning: {
  //         $sum: { $cond: [{ $eq: ['$latest.value', 'WARN'] }, 1, 0] },
  //       },
  //       failedProjects: { $sum: { $cond: [{ $eq: ['$latest.value', 'ERROR'] }, 1, 0] } },
  //     },
  //   },
  //   { $project: { _id: 0 } },
  // ]);

  const sonarProjects = await SonarProjectsForRepoModel.aggregate<{
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
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonaralerthistories',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] },
            },
          },
          { $sort: { date: -1 } },
          { $limit: 1 },
        ],
        as: 'latest',
      },
    },
    {
      $unwind: {
        path: '$latest',
        preserveNullAndEmptyArrays: false,
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

  return (
    sonarProjects[0] || {
      totalProjects: 0,
      passedProjects: 0,
      projectsWithWarning: 0,
      failedProjects: 0,
    }
  );
};

const getSonarProjectIdsBeforeStartDate = async (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date
) => {
  const sonarProjectIdsBeforeStartDate = await SonarProjectsForRepoModel.aggregate<{
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
      },
    },
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonaralerthistories',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              repositoryId: { $in: repositoryIds },
              $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] },
              date: { $lt: startDate },
            },
          },
          { $sort: { date: -1 } },
        ],
        as: 'alerts',
      },
    },
    {
      $unwind: {
        path: '$alerts',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $sort: { date: -1 },
    },
    {
      $group: {
        _id: {
          repositoryId: '$repositoryId',
          sonarProjectId: '$sonarProjectIds',
        },
        sonarProjectId: { $first: '$sonarProjectIds' },
        latest: { $first: '$$ROOT' },
      },
    },
    {
      $group: {
        _id: null,
        allProjectIds: {
          $addToSet: {
            $toString: '$sonarProjectId',
          },
        },
        failedProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.alerts.value', 'ERROR'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        okProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.alerts.value', 'OK'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        warnProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.alerts.value', 'WARN'] },
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

  return SonarProjectsForRepoModel.aggregate<{
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
      },
    },
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonaralerthistories',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              repositoryId: { $in: repositoryIds },
              $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] },
              date: inDateRange(startDate, endDate),
            },
          },
          { $sort: { date: -1 } },
        ],
        as: 'alerts',
      },
    },
    {
      $unwind: {
        path: '$alerts',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $addFields: {
        weekIndex: {
          $trunc: { $divide: [{ $subtract: ['$alerts.date', startDate] }, oneWeekInMs] },
        },
      },
    },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: {
          repositoryId: '$repositoryId',
          weekIndex: '$weekIndex',
          sonarProjectId: '$sonarProjectIds',
        },
        sonarProjectId: { $first: '$sonarProjectIds' },
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
              if: { $eq: ['$latest.alerts.value', 'ERROR'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        okProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.alerts.value', 'OK'] },
              then: { $toString: '$sonarProjectId' },
              else: null,
            },
          },
        },
        warnProjectIds: {
          $addToSet: {
            $cond: {
              if: { $eq: ['$latest.alerts.value', 'WARN'] },
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

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);
  const completeWeeklySonarProjectIds = range(0, numberOfIntervals).map(weekIndex => {
    return (
      weeklySonarProjectIds.find(week => week.weekIndex === weekIndex) || {
        weekIndex,
        allProjectIds: [],
        okProjectIds: [],
        warnProjectIds: [],
        failedProjectIds: [],
      }
    );
  });

  const passedProjectsSet = new Set(preStartDateSonarSummary?.okProjectIds || []);
  const warningProjectsSet = new Set(preStartDateSonarSummary?.warnProjectIds || []);
  const failedProjectsSet = new Set(preStartDateSonarSummary?.failedProjectIds || []);
  const allProjectsSet = new Set(preStartDateSonarSummary?.allProjectIds || []);
  const weeklyUpdatedStats = completeWeeklySonarProjectIds.map(week => {
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

  return weeklyUpdatedStats.slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};

export const getReposWithSonarQube = async (
  collectionName: string,
  project: string,
  repositoryIds: string[]
) => {
  return SonarProjectsForRepoModel.aggregate<{ count: number }>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repositoryIds },
        'sonarProjectIds.0': { $exists: true },
      },
    },
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonarmeasures',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          { $match: { $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] } } },
          { $sort: { fetchDate: -1 } },
          { $limit: 1 },
        ],
        as: 'sonarMeasures',
      },
    },
    {
      $unwind: {
        path: '$sonarMeasures',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $addFields: {
        sonarMeasures: {
          $filter: {
            input: '$sonarMeasures.measures',
            cond: { $eq: ['$$this.metric', 'alert_status'] },
          },
        },
      },
    },
    {
      $unwind: {
        path: '$sonarMeasures',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: {
          collectionName: '$collectionName',
          project: '$project',
          repositoryId: '$repositoryId',
        },
        sonarProjects: {
          $push: {
            id: '$sonarProjectIds',
            qualityGateDetails: '$sonarMeasures.value',
            name: '$sonarProjectName',
          },
        },
      },
    },
    { $count: 'count' },
  ]).then(result => {
    return result[0]?.count ?? 0;
  });
};

export const getReposWithSonarQubeBeforeStartDate = (
  collectionName: string,
  project: string,
  repositoryIds: string[],
  startDate: Date
) => {
  return SonarProjectsForRepoModel.aggregate<{ repositoryIds: string[] }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
      },
    },
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonaralerthistories',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] },
              date: { $lt: startDate },
            },
          },
          { $sort: { date: -1 } },
          { $limit: 1 },
        ],
        as: 'preStartDateAlerts',
      },
    },
    {
      $unwind: {
        path: '$preStartDateAlerts',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: null,
        repositoryIds: { $addToSet: '$repositoryId' },
      },
    },
    {
      $project: { _id: 0 },
    },
  ]).then(result => {
    return result[0]?.repositoryIds ?? [];
  });
};

export const getWeeklyReposWithSonarQubeSummary = (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return SonarProjectsForRepoModel.aggregate<{
    weekIndex: number;
    repos: string[];
  }>([
    {
      $match: {
        collectionName,
        project,
        repositoryId: { $in: repositoryIds },
      },
    },
    {
      $unwind: {
        path: '$sonarProjectIds',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'sonaralerthistories',
        let: { sonarProjectId: '$sonarProjectIds' },
        pipeline: [
          {
            $match: {
              collectionName,
              project,
              repositoryId: { $in: repositoryIds },
              $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] },
              date: inDateRange(startDate, endDate),
            },
          },
          { $sort: { date: -1 } },
        ],
        as: 'alerts',
      },
    },
    {
      $unwind: {
        path: '$alerts',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $addFields: {
        weekIndex: {
          $trunc: { $divide: [{ $subtract: ['$alerts.date', startDate] }, oneWeekInMs] },
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

  const { numberOfDays, numberOfIntervals } = createIntervals(startDate, endDate);

  const completeWeeklyReposSummary = range(0, numberOfIntervals).map(weekIndex => {
    return (
      weeklyReposSummary.find(week => week.weekIndex === weekIndex) || {
        weekIndex,
        repos: [],
      }
    );
  });

  const reposSet = new Set(preStartDateReposSummary);

  const weeklyUpdatedStats = completeWeeklyReposSummary.map(week => {
    week.repos.forEach(id => {
      reposSet.add(id);
    });

    return {
      weekIndex: week.weekIndex,
      count: reposSet.size,
    };
  });

  return weeklyUpdatedStats.slice(numberOfIntervals - Math.floor(numberOfDays / 7));
};

export const getSonarQualityGateStatusForRepoName = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const sonarProjectIds = await getSonarProjectIdsForRepo(
    collectionName,
    project,
    repositoryId
  );

  if (!sonarProjectIds.length) return null;

  const [measures, sonarConnections, sonarProjectById] = await Promise.all([
    getLatestSonarMeasures(sonarProjectIds),
    getConnections('sonar'),
    sonarProjectsForIds(sonarProjectIds),
  ]);

  return measures
    .map(measure => {
      const { qualityGateStatus } = getMeasureValue(measure.fetchDate, measure.measures);

      const sonarProject = sonarProjectById(
        sonarProjectIds.find(p => p._id.equals(measure.sonarProjectId))
      );
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
        ? await getSonarQualityGateStatusForRepoName(collectionName, project, repo.id)
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

//  TODO: Solving N+1 problem of getting sonar quality gate status for each repo

export const getSonarQualityGateStatusForRepoId = async (
  collectionName: string,
  project: string,
  repositoryId: string
) => {
  const sonarProjectIds = await getSonarProjectIdsForRepo(
    collectionName,
    project,
    repositoryId
  );

  if (!sonarProjectIds.length) return null;

  const [measures, sonarConnections, sonarProjectById] = await Promise.all([
    getLatestSonarMeasures(sonarProjectIds),
    getConnections('sonar'),
    sonarProjectsForIds(sonarProjectIds),
  ]);

  return measures
    .map(measure => {
      const { qualityGateStatus } = getMeasureValue(measure.fetchDate, measure.measures);
      const sonarProject = sonarProjectById(
        sonarProjectIds.find(p => p._id.equals(measure.sonarProjectId))
      );

      if (!sonarProject) return null;

      const sonarConnection = sonarConnections.find(sh =>
        sh._id.equals(sonarProject.connectionId)
      );

      if (!sonarConnection) return null;

      return {
        name: sonarProject.name,
        quality: {
          gate: qualityGateStatus,
        },
      };
    })
    .filter(exists);
};

export const getReposSortedByCodeQuality = async (
  queryContext: QueryContext,
  repositoryIds: string[],
  sortOrder: 'asc' | 'desc',
  pageSize: number,
  pageNumber: number
) => {
  const { collectionName, project } = fromContext(queryContext);

  const repositories = await getDefaultBranchAndNameForRepoIds(
    queryContext,
    repositoryIds
  );

  const qualityGateStatus = await Promise.all(
    repositories.map(async repo => {
      const qualityGates = repo.defaultBranch
        ? await getSonarQualityGateStatusForRepoId(collectionName, project, repo.id)
        : null;

      if (!qualityGates) {
        return {
          repositoryId: repo.id,
          status: -1,
        };
      }

      const status = qualityGates.map(qg => qg.quality.gate);
      return {
        repositoryId: repo.id,
        status: weightedQualityGate(status),
      };
    })
  );

  const allRepos = qualityGateStatus.sort(desc(byNum(repo => repo.status)));
  const sortedRepos = sortOrder === 'asc' ? allRepos.reverse() : allRepos;

  return sortedRepos.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
};

type ReposWithSonarSetup = {
  repositoryId: string;
  repositoryName: string;
  sonarProjects: {
    hasSonarMeasures: boolean;
    id: Types.ObjectId;
    qualityGateDetails: string;
    name: string;
    key: string;
    connectionId: Types.ObjectId;
  }[];
  projectsWithSonarMeasures: number;
};

type ReposWithoutSonarSetup = Omit<ReposWithSonarSetup, 'sonarProjects'>;

export const getReposWithoutSonarSetup = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  return SonarProjectsForRepoModel.aggregate<ReposWithoutSonarSetup>([
    {
      $match: {
        collectionName,
        project,
        'repositoryId': { $in: repositoryIds },
        'sonarProjectIds.0': { $exists: false },
      },
    },
    {
      $lookup: {
        from: 'repositories',
        let: { repositoryId: '$repositoryId' },
        pipeline: [
          {
            $match: {
              collectionName,
              'project.name': project,
              '$expr': { $eq: ['$id', '$$repositoryId'] },
            },
          },
        ],
        as: 'result',
      },
    },
    { $addFields: { repositoryName: { $arrayElemAt: ['$result.name', 0] } } },
    { $project: { _id: 0, result: 0 } },
  ]);
};

export const getReposWithSonarSetup = async (
  queryContext: QueryContext,
  repositoryIds: string[]
) => {
  const { collectionName, project } = fromContext(queryContext);

  const [repos, connections] = await Promise.all([
    SonarProjectsForRepoModel.aggregate<ReposWithSonarSetup>([
      {
        $match: {
          collectionName,
          project,
          'sonarProjectIds.0': { $exists: true },
          'repositoryId': { $in: repositoryIds },
        },
      },
      {
        $unwind: {
          path: '$sonarProjectIds',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: 'sonarprojects',
          let: { sonarProjectId: '$sonarProjectIds' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$sonarProjectId'] } } },
            { $sort: { fetchDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                name: 1,
                key: 1,
                connectionId: 1,
              },
            },
          ],
          as: 'sonarProjectName',
        },
      },
      {
        $addFields: {
          sonarProjectName: { $arrayElemAt: ['$sonarProjectName.name', 0] },
          sonarConnectionId: { $arrayElemAt: ['$sonarProjectName.connectionId', 0] },
          sonarProjectKey: { $arrayElemAt: ['$sonarProjectName.key', 0] },
        },
      },
      {
        $lookup: {
          from: 'sonarmeasures',
          let: { sonarProjectId: '$sonarProjectIds' },
          pipeline: [
            { $match: { $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] } } },
            { $sort: { fetchDate: -1 } },
            { $limit: 1 },
          ],
          as: 'sonarMeasures',
        },
      },
      {
        $unwind: {
          path: '$sonarMeasures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          sonarMeasures: {
            $filter: {
              input: '$sonarMeasures.measures',
              cond: { $eq: ['$$this.metric', 'alert_status'] },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$sonarMeasures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          hasSonarMeasures: {
            $cond: {
              if: { $ifNull: ['$sonarMeasures.value', false] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $group: {
          _id: {
            collectionName: '$collectionName',
            project: '$project',
            repositoryId: '$repositoryId',
          },
          sonarProjects: {
            $push: {
              id: '$sonarProjectIds',
              qualityGateDetails: '$sonarMeasures.value',
              name: '$sonarProjectName',
              key: '$sonarProjectKey',
              connectionId: '$sonarConnectionId',
              hasSonarMeasures: '$hasSonarMeasures',
            },
          },
          projectsWithSonarMeasures: {
            $sum: { $cond: [{ $eq: ['$hasSonarMeasures', true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          result: 1,
          collectionName: '$_id.collectionName',
          project: '$_id.project',
          repositoryId: '$_id.repositoryId',
          sonarProjects: 1,
          projectsWithSonarMeasures: 1,
        },
      },
      {
        $lookup: {
          from: 'repositories',
          let: { repositoryId: '$repositoryId' },
          pipeline: [
            {
              $match: {
                collectionName,
                'project.name': project,
                '$expr': { $eq: ['$id', '$$repositoryId'] },
              },
            },
          ],
          as: 'result',
        },
      },
      { $addFields: { repositoryName: { $arrayElemAt: ['$result.name', 0] } } },
      { $project: { _id: 0, result: 0 } },
    ]),
    getConnections('sonar'),
  ]);

  return repos.map(repo => ({
    repositoryId: repo.repositoryId,
    repositoryName: repo.repositoryName,
    projectsWithSonarMeasures: repo.projectsWithSonarMeasures,
    sonarProjects: repo.sonarProjects.map(sonarProject => {
      const connectionUrl = connections.find(
        connection => connection._id.toString() === sonarProject.connectionId.toString()
      )?.url;

      return {
        id: sonarProject.id,
        name: sonarProject.name,
        status: parseQualityGateStatus(sonarProject.qualityGateDetails),
        hasSonarMeasures: sonarProject.hasSonarMeasures,
        url: connectionUrl ? `${connectionUrl}/dashboard?id=${sonarProject.key}` : null,
      };
    }),
  }));
};

export const getSonarRepos = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  const [sonarRepos, nonSonarRepos] = await Promise.all([
    getReposWithSonarSetup(
      queryContext,
      activeRepos.map(repo => repo.id)
    ),
    getReposWithoutSonarSetup(
      queryContext,
      activeRepos.map(repo => repo.id)
    ),
  ]);

  return { sonarRepos, nonSonarRepos };
};

export const getSonarProjectsForDownload = async ({
  queryContext,
  searchTerms,
  groupsIncluded,
  teams,
}: z.infer<typeof filteredReposInputParser>) => {
  const { collectionName, project } = fromContext(queryContext);
  const activeRepos = await getActiveRepos(
    queryContext,
    searchTerms,
    groupsIncluded,
    teams
  );

  const [sonarRepos, nonSonarRepos, connections] = await Promise.all([
    SonarProjectsForRepoModel.aggregate<{
      collectionName: string;
      project: string;
      repositoryId: string;
      sonarProjectIds: Types.ObjectId;
      sonarProjectName: string;
      sonarConnectionId: Types.ObjectId;
      sonarProjectKey: string;
      hasSonarMeasures: boolean;
      repositoryName: string;
      repositoryUrl: string;
      status: 'unknown' | 'OK' | 'WARN' | 'ERROR';
    }>([
      {
        $match: {
          collectionName,
          project,
          'repositoryId': { $in: activeRepos.map(repo => repo.id) },
          'sonarProjectIds.0': { $exists: true },
        },
      },
      {
        $unwind: {
          path: '$sonarProjectIds',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: 'sonarprojects',
          let: { sonarProjectId: '$sonarProjectIds' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$sonarProjectId'] } } },
            { $sort: { fetchDate: -1 } },
            { $limit: 1 },
            {
              $project: {
                name: 1,
                key: 1,
                connectionId: 1,
              },
            },
          ],
          as: 'sonarProjectName',
        },
      },
      {
        $addFields: {
          sonarProjectName: { $arrayElemAt: ['$sonarProjectName.name', 0] },
          sonarConnectionId: { $arrayElemAt: ['$sonarProjectName.connectionId', 0] },
          sonarProjectKey: { $arrayElemAt: ['$sonarProjectName.key', 0] },
        },
      },
      {
        $lookup: {
          from: 'sonarmeasures',
          let: { sonarProjectId: '$sonarProjectIds' },
          pipeline: [
            { $match: { $expr: { $eq: ['$sonarProjectId', '$$sonarProjectId'] } } },
            { $sort: { fetchDate: -1 } },
            { $limit: 1 },
          ],
          as: 'sonarMeasures',
        },
      },
      {
        $unwind: {
          path: '$sonarMeasures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          sonarMeasures: {
            $filter: {
              input: '$sonarMeasures.measures',
              cond: { $eq: ['$$this.metric', 'alert_status'] },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$sonarMeasures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          hasSonarMeasures: {
            $cond: {
              if: { $ifNull: ['$sonarMeasures.value', false] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'repositories',
          let: { repositoryId: '$repositoryId' },
          pipeline: [
            {
              $match: {
                collectionName,
                'project.name': project,
                '$expr': { $eq: ['$id', '$$repositoryId'] },
              },
            },
          ],
          as: 'result',
        },
      },
      {
        $addFields: {
          repositoryName: { $arrayElemAt: ['$result.name', 0] },
          repositoryUrl: { $arrayElemAt: ['$result.url', 0] },
          status: { $cond: ['$hasSonarMeasures', '$sonarMeasures.value', 'unknown'] },
        },
      },
      {
        $project: {
          _id: 0,
          result: 0,
          sonarMeasures: 0,
        },
      },
    ]),
    SonarProjectsForRepoModel.aggregate<{
      collectionName: string;
      project: string;
      repositoryId: string;
      repositoryName: string;
      repositoryUrl: string;
      status: null;
      sonarProjectName: null;
      sonarProjectUrl: null;
    }>([
      {
        $match: {
          collectionName,
          project,
          'repositoryId': { $in: activeRepos.map(repo => repo.id) },
          'sonarProjectIds.0': {
            $exists: false,
          },
        },
      },
      {
        $lookup: {
          from: 'repositories',
          let: { repositoryId: '$repositoryId' },
          pipeline: [
            {
              $match: {
                collectionName,
                'project.name': project,
                '$expr': { $eq: ['$id', '$$repositoryId'] },
              },
            },
          ],
          as: 'result',
        },
      },
      {
        $addFields: {
          repositoryName: { $arrayElemAt: ['$result.name', 0] },
          repositoryUrl: { $arrayElemAt: ['$result.url', 0] },
          status: null,
          sonarProjectName: null,
        },
      },
      {
        $project: {
          _id: 0,
          result: 0,
          sonarProjectIds: 0,
        },
      },
    ]),
    getConnections('sonar'),
  ]);

  const sonarReposWithUrl = sonarRepos.map(repo => {
    const connectionUrl = connections.find(
      connection => connection._id.toString() === repo.sonarConnectionId.toString()
    )?.url;
    return {
      ...repo,
      status: capitalizeFirstLetter(parseQualityGateStatus(repo.status)),
      sonarProjectUrl: connectionUrl
        ? `${connectionUrl}/dashboard?id=${repo.sonarProjectKey}`
        : null,
    };
  });
  return [...sonarReposWithUrl, ...nonSonarRepos];
};
