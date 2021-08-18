export type Tab = 'repos' | 'release-pipelines' | 'workitems';

export type Dev = {
  name: string;
  imageUrl: string;
  repos: {
    name: string;
    byDate: Record<string, number>;
    changes: { add: number; delete: number; edit: number };
  }[];
};
