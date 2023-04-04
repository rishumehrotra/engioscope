import { z } from 'zod';
import { collectionsAndProjects, collections } from '../config.js';

export const getAllCollections = () => {
  return collections().map(c => ({ name: c.name, projectsCount: c.projects.length }));
};

export const CollectionInputParser = z.object({
  collectionName: z.string(),
});
export const getProjectsForCollection = ({
  collectionName,
}: z.infer<typeof CollectionInputParser>) => {
  return collections()
    .find(c => c.name === collectionName)
    ?.projects.map(p => p.name);
};

export const ProjectSearchInputParser = z.object({
  searchTerm: z.string(),
});

export const searchProjects = ({
  searchTerm,
}: z.infer<typeof ProjectSearchInputParser>) => {
  return collectionsAndProjects()
    .filter(([, project]) =>
      project.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    )
    .map(([collection, project]) => {
      return {
        name: collection.name,
        project: project.name,
      };
    })
    .slice(0, 7);
};
