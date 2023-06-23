import { model, Schema } from 'mongoose';

export type Team = {
  collectionName: string;
  project: string;
  name: string;
  repoIds: string[];
};

const teamSchema = new Schema<Team>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  name: { type: String, required: true },
  repoIds: [{ type: String, required: true }],
});

teamSchema.index(
  {
    collectionName: 1,
    project: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export const TeamModel = model<Team>('Team', teamSchema);
