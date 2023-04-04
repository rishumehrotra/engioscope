import { z } from 'zod';
import { collectionsAndProjects } from '../config.js';

export const getAllCollections = () => {
  const result = collectionsAndProjects()
    .map(([collection, project]) => {
      return {
        name: collection.name,
        project: project.name,
      };
    })
    .reduce<{ name: string; projectsCount: number }[]>((acc, curr) => {
      const index = acc.findIndex(item => item.name === curr.name);
      if (index < 0) {
        acc.push({
          name: curr.name,
          projectsCount: 1,
        });
      } else {
        acc[index].projectsCount += 1;
      }
      return acc;
    }, []);
  return result;
};

export const CollectionInputParser = z.object({
  collectionName: z.string(),
});
export const getProjectsForCollection = ({
  collectionName,
}: z.infer<typeof CollectionInputParser>) => {
  const result = collectionsAndProjects()
    .map(([collection, project]) => {
      return {
        name: collection.name,
        project: project.name,
      };
    })
    .filter(item => item.name === collectionName);

  return result;
};

export const ProjectSearchInputParser = z.object({
  searchTerm: z.string(),
});

export const searchProjects = ({
  searchTerm,
}: z.infer<typeof ProjectSearchInputParser>) => {
  const result = collectionsAndProjects()
    .map(([collection, project]) => {
      return {
        name: collection.name,
        project: project.name,
      };
    })
    .filter(item => item.project.toLowerCase().startsWith(searchTerm));

  return result;
};
