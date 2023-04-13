import { model, Schema } from 'mongoose';

type BuildStats = {
  count: number;
  byWeek: {
    count: number;
    start: Date;
    end: Date;
    weekIndex: number;
  }[];
};

type WeeklyTest = {
  weekIndex: number;
  passedTests: number;
  totalTests: number;
};

type WeeklyCoverage = {
  weekIndex: number;
  coveredBranches: number;
  totalBranches: number;
};

export type Summary = {
  collectionName: string;
  project: string;
  duration: '30 days' | '90 days' | '180 days';
  startDate: Date;
  endDate: Date;
  pipelines: {
    totalCount: number;
    yamlCount: number;
  };
  healthyBranches: {
    total: number;
    healthy: number;
  };
  centralTemplateUsage: {
    templateUsers: number;
  };
  totalBuilds: BuildStats;
  successfulBuilds: BuildStats;
  totalActiveRepos: number;
  totalRepos: number;
  hasReleasesReposCount: number;
  centralTemplatePipeline: {
    total: number;
    central: number;
  };
  totalDefs: number;
  defsWithTests: number;
  defsWithCoverage: number;
  weeklyTestsSummary: WeeklyTest[];
  weeklyCoverageSummary: WeeklyCoverage[];
  latestTestsSummary: WeeklyTest;
  latestCoverageSummary: WeeklyCoverage;
};

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

    totalDefs: { type: Number },
    defsWithTests: { type: Number },
    defsWithCoverage: { type: Number },

    weeklyTestsSummary: [
      {
        weekIndex: { type: Number },
        passedTests: { type: Number },
        totalTests: { type: Number },
      },

      {
        timestamps: true,
      },
    ],

    weeklyCoverageSummary: [
      {
        weekIndex: { type: Number },
        coveredBranches: { type: Number },
        totalBranches: { type: Number },
      },

      {
        timestamps: true,
      },
    ],

    latestTestsSummary: {
      weekIndex: { type: Number },
      passedTests: { type: Number },
      totalTests: { type: Number },
    },

    latestCoverageSummary: {
      weekIndex: { type: Number },
      coveredBranches: { type: Number },
      totalBranches: { type: Number },
    },
  },
  { timestamps: true }
);

summarySchema.index({
  collectionName: 1,
  project: 1,
  duration: 1,
});

export const SummaryModel = model<Summary>('Summary', summarySchema);
