import { z } from 'zod';
import Fuse from 'fuse.js';
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

const getFuse = (() => {
  let fuse: Fuse<{
    collectionName: string;
    project: string;
    searchable: string;
  }>;
  return () => {
    if (!fuse) {
      fuse = new Fuse(
        collectionsAndProjects().map(([{ name: collectionName }, { name: project }]) => {
          return { collectionName, project, searchable: project };
        }),
        {
          includeScore: true,
          keys: ['searchable'],
          ignoreLocation: true,
          ignoreFieldNorm: true,
        }
      );
    }
    return fuse;
  };
})();

export const searchProjects = ({
  searchTerm,
}: z.infer<typeof ProjectSearchInputParser>) => {
  return getFuse()
    .search(searchTerm)
    .slice(0, 7)
    .map(x => {
      return { collectionName: x.item.collectionName, project: x.item.project };
    });
};
