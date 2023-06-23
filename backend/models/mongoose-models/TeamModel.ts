import { model, Schema } from 'mongoose';

export type Team = {
  name: string;
  collectionName: string;
  project: string;
  repoIds: string[];
};

const teamSchema = new Schema<Team>({
  name: { type: String, required: true },
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  repoIds: [{ type: String, required: true }],
});

teamSchema.index({
  collectionName: 1,
  project: 1,
});

export const TeamModel = model<Team>('Team', teamSchema);
