import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import debug from 'debug';
import pluralize from 'pluralize';
import type {
  ProjectOverviewAnalysis,
  ProjectReleasePipelineAnalysis,
  ProjectRepoAnalysis,
  ProjectWorkItemAnalysis,
  SummaryMetrics,
  TrackMetricsByTrack,
  TrackFlowMetrics,
  UIChangeProgram,
  UIChangeProgramTask,
  UIProjectAnalysis,
  TrackwiseData,
  TrackFeatures,
} from '../../shared/types.js';
import type { ProjectAnalysis } from './types.js';
import type { ParsedConfig, ParsedProjectConfig } from './parse-config.js';

const outputFileLog = debug('write-output');

const dataFolderPath = join(process.cwd(), 'data');

const writeFile = async (path: string[], fileName: string, contents: string) => {
  outputFileLog(
    'Writing',
    join(dataFolderPath, ...path, fileName).replace(`${process.cwd()}/`, '')
  );
  await fs.mkdir(join(dataFolderPath, ...path), { recursive: true });
  return fs.writeFile(join(dataFolderPath, ...path, fileName), contents, 'utf8');
};

const projectSummary = (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
): UIProjectAnalysis => ({
  name: [collectionName, projectConfig.name],
  lastUpdated: new Date().toISOString(),
  reposCount: projectAnalysis.repoAnalysis.length,
  releasePipelineCount: projectAnalysis.releaseAnalysis.pipelines.length,
  workItemCount:
    Object.values(projectAnalysis.workItemAnalysis?.analysedWorkItems?.ids[0] || {})
      .length || 0,
  workItemLabel: [
    pluralize.singular(projectAnalysis.workItemLabel),
    projectAnalysis.workItemLabel,
  ],
});

const writeRepoAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectRepoAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    repos: projectAnalysis.repoAnalysis,
    featureToggles: projectAnalysis.featureToggles,
    groups: projectConfig.groupRepos,
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'repos.json',
    JSON.stringify(analysis)
  );
};

const writeReleaseAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectReleasePipelineAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    ...projectAnalysis.releaseAnalysis,
    stagesToHighlight: projectConfig.releasePipelines?.stagesToHighlight,
    ignoreStagesBefore: projectConfig.releasePipelines?.ignoreStagesBefore,
    groups: projectConfig.groupRepos,
    environments: projectConfig.environments,
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'releases.json',
    JSON.stringify(analysis)
  );
};

const writeWorkItemAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectWorkItemAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    workItems: projectAnalysis.workItemAnalysis.analysedWorkItems,
    taskType: projectConfig.workitems.label,
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'work-items.json',
    JSON.stringify(analysis)
  );
};

const writeOverviewFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectOverviewAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    overview: projectAnalysis.workItemAnalysis?.overview,
    testCases: projectAnalysis.testCasesAnalysis,
    ignoreForWIP: projectConfig.workitems.ignoreForWIP,
    environments: projectConfig.environments,
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'overview.json',
    JSON.stringify(analysis)
  );
};

export default (collectionName: string, projectConfig: ParsedProjectConfig) =>
  (analysis: ProjectAnalysis) =>
    Promise.all([
      writeRepoAnalysisFile(collectionName, projectConfig, analysis),
      writeReleaseAnalysisFile(collectionName, projectConfig, analysis),
      writeWorkItemAnalysisFile(collectionName, projectConfig, analysis),
      writeOverviewFile(collectionName, projectConfig, analysis),
    ]);

export const writeSummaryMetricsFile = (summary: SummaryMetrics) =>
  writeFile(['./'], 'summary-metrics.json', JSON.stringify(summary));

export const writeTrackFlowMetrics = (tracks: TrackMetricsByTrack) => {
  const tracksWorkItems: TrackFlowMetrics = {
    tracks,
    lastUpdated: new Date().toISOString(),
  };

  return writeFile(['./'], 'track-flow-metrics.json', JSON.stringify(tracksWorkItems));
};

export const writeTrackFeatures = (tracks: TrackwiseData[]) => {
  const tracksWorkItems: TrackFeatures = {
    tracks,
    lastUpdated: new Date().toISOString(),
  };

  return writeFile(['./'], 'track-features.json', JSON.stringify(tracksWorkItems));
};

export const writeChangeProgramFile =
  (config: ParsedConfig) => (tasks: UIChangeProgramTask[]) => {
    const someCollectionWithChangeProgram = config.azure.collections.find(
      c => c.changeProgram
    );

    const changeProgram: UIChangeProgram = {
      lastUpdated: new Date().toISOString(),
      details: someCollectionWithChangeProgram
        ? {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            taskName: someCollectionWithChangeProgram.changeProgram!.workItemTypeName,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            name: someCollectionWithChangeProgram.changeProgram!.name,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            startedState: someCollectionWithChangeProgram.changeProgram!.startedState,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            doneState: someCollectionWithChangeProgram.changeProgram!.doneState,
            tasks,
          }
        : null,
    };

    return writeFile(['./'], 'change-program.json', JSON.stringify(changeProgram));
  };
