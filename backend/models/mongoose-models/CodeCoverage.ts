import { model, Schema } from 'mongoose';

type CodeCoverageData = {
  coverageStats: {
    covered: number;
    delta?: number;
    isDeltaAvailable?: boolean;
    label: string;
    position: number;
    total: number;
  }[];
};

export type CodeCoverageSummary = {
  collectionName: string;
  project: string;
  coverageData: CodeCoverageData[];
  build: {
    id: number;
    url: string;
  };
};

const codeCoverageSchema = new Schema<CodeCoverageSummary>(
  {
    collectionName: { type: String, required: true },
    project: { type: String, required: true },
    build: {
      id: { type: Number },
      url: { type: String },
    },
    coverageData: [
      {
        coverageStats: [
          {
            covered: { type: Number, required: true },
            delta: { type: Number },
            isDeltaAvailable: { type: Boolean },
            label: { type: String },
            position: { type: Number },
            total: { type: Number },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

codeCoverageSchema.index({
  'collectionName': 1,
  'project': 1,
  'build.id': 1,
});

export const CodeCoverageModel = model<CodeCoverageSummary>(
  'CodeCoverage',
  codeCoverageSchema
);
