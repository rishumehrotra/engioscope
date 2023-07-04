import type expresss from 'express';
import { saveBuildReport } from '../models/build-reports.js';
import { htmlReportToObj } from '../scraper/parse-build-reports.js';

const saveBuildReportToMongo = async (html: string) => {
  const report = htmlReportToObj(html);
  if (!report) return;
  const { collection, repoName, ...rest } = report;
  return saveBuildReport({
    ...rest,
    collectionName: collection,
    repo: repoName,
  });
};

export default async (req: expresss.Request, res: expresss.Response) => {
  try {
    await saveBuildReportToMongo(req.body);
    res.sendStatus(200);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('400')) {
      res.status(400).send(error.message.replace('400 - ', ''));
      return;
    }
    // eslint-disable-next-line no-console
    console.error('Error saving build report html', error);
    res.status(500).send(error);
  }
};
