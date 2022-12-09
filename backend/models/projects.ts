import { model, Schema } from 'mongoose';
import type { ProjectState, ProjectVisibility } from '../scraper/types-azure.js';

export type Project = {
  collectionName: string;
  id: string;
  name: string;
  description?: string;
  url?: string;
  state: ProjectState;
  revision?: number;
  visibility: ProjectVisibility;
  lastUpdatedTime: Date;
};

const projectSchema = new Schema<Project>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  url: { type: String },
  state: { type: String, required: true },
  revision: { type: Number },
  visibility: { type: String },
  lastUpdatedTime: { type: Date }
});

projectSchema.index({ collectionName: 1, name: 1 });

const ProjectModel = model<Project>('Project', projectSchema);

export const bulkSaveProjects = (collectionName: string) => (projects: Project[]) => (
  ProjectModel.bulkWrite(projects.map(project => {
    const { id, ...rest } = project;

    return {
      updateOne: {
        filter: {
          collectionName,
          'id': id
        },
        update: { $set: { ...rest } },
        upsert: true
      }
    };
  }))
);

export const getProjects = (collectionName: string) => (
  ProjectModel.find({ collectionName }).lean()
);
