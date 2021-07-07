// Sonar's types

export type Measure = {
  metric: string,
  value: string
};

export type CodeQuality = {
  id: string,
  key: string,
  name: string,
  description: string,
  qualifier: string,
  measures: Measure[]
};

export type Config = Readonly<{
  repoType: 'azure',
  host: string,
  token: string,
  lookAtPast: string,
  cacheToDiskFor: string,
  port: number,
  projects: [collectionName: string, projectName: string][],
  sonar: { url: string, token: string }[]
}>;
