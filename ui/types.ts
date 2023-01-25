export type Tab =
  | ''
  | 'repos'
  | 'release-pipelines'
  | 'release-pipelines2'
  | 'workitems'
  | 'devs';

export type Dev = {
  name: string;
  imageUrl: string;
  repos: {
    name: string;
    byDate: Record<string, number>;
    changes: { add: number; delete: number; edit: number };
  }[];
};
