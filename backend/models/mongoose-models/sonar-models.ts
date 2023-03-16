import type { ObjectId } from 'mongoose';
import { model, Schema } from 'mongoose';

export type SonarProject = {
  connectionId: ObjectId;
  organization?: string;
  id?: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: Date;
};

const sonarProjectSchema = new Schema<SonarProject>(
  {
    connectionId: Schema.Types.ObjectId,
    organization: String,
    id: String,
    key: { type: String, required: true },
    name: { type: String, required: true },
    qualifier: { type: String, required: true },
    visibility: { type: String, required: true },
    lastAnalysisDate: Date,
  },
  { timestamps: true }
);

sonarProjectSchema.index({
  connectionId: 1,
  key: 1,
});

export const SonarProjectModel = model<SonarProject>('SonarProject', sonarProjectSchema);
