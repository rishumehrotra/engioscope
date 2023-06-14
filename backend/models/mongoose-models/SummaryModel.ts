import { model, Schema } from 'mongoose';
import type { SummaryStats } from '../repo-listing.js';
import type { summary } from '../release-listing.js';

export type Summary = {
  collectionName: string;
  project: string;
  duration: '30 days' | '90 days' | '180 days';
  startDate: Date;
  endDate: Date;
} & SummaryStats &
  Awaited<ReturnType<typeof summary>>;

const summarySchema = new Schema<Summary>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    duration: { type: String, required: true },
    pipelines: {
      totalCount: { type: Number },
      yamlCount: { type: Number },
    },
    healthyBranches: {
      total: { type: Number },
      healthy: { type: Number },
    },
    centralTemplateUsage: {
      templateUsers: { type: Number },
    },
    totalBuilds: {
      count: { type: Number },
      byWeek: [
        {
          count: { type: Number },
          start: { type: Date },
          end: { type: Date },
          weekIndex: { type: Number },
        },
      ],
    },
    successfulBuilds: {
      count: { type: Number },
      byWeek: [
        {
          count: { type: Number },
          start: { type: Date },
          end: { type: Date },
          weekIndex: { type: Number },
        },
      ],
    },
    totalActiveRepos: { type: Number },
    totalRepos: { type: Number },
    hasReleasesReposCount: { type: Number },
    centralTemplatePipeline: {
      total: { type: Number },
      central: { type: Number },
    },
    defSummary: {
      totalDefs: { type: Number },
      defsWithTests: { type: Number },
      defsWithCoverage: { type: Number },
    },
    weeklyTestsSummary: [
      {
        weekIndex: { type: Number },
        passedTests: { type: Number },
        totalTests: { type: Number },
      },
    ],
    weeklyCoverageSummary: [
      {
        weekIndex: { type: Number },
        coveredBranches: { type: Number },
        totalBranches: { type: Number },
      },
    ],
    sonarProjects: {
      totalProjects: { type: Number },
      passedProjects: { type: Number },
      projectsWithWarning: { type: Number },
      failedProjects: { type: Number },
    },
    weeklySonarProjectsCount: [
      {
        weekIndex: { type: Number },
        passedProjects: { type: Number },
        projectsWithWarnings: { type: Number },
        failedProjects: { type: Number },
        totalProjects: { type: Number },
      },
    ],
    reposWithSonarQube: { type: Number },
    weeklyReposWithSonarQubeCount: [
      {
        weekIndex: { type: Number },
        count: { type: Number },
      },
    ],
    branchPolicy: {
      conforms: { type: Number },
      total: { type: Number },
    },
    runCount: { type: Number },
    pipelineCount: { type: Number },
    lastEnv: {
      envName: { type: String },
      deploys: { type: Number },
      successful: { type: Number },
    },
    startsWithArtifact: { type: Number },
    masterOnly: { type: Number },
    stagesToHighlight: [
      {
        name: { type: String },
        exists: { type: Number },
        used: { type: Number },
      },
    ],
    ignoredStagesBefore: { type: String },
  },
  { timestamps: true }
);

summarySchema.index({
  collectionName: 1,
  project: 1,
  duration: 1,
});

export const SummaryModel = model<Summary>('Summary', summarySchema);
