import type expresss from 'express';
import { parse as parseHtml } from 'node-html-parser';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { saveBuildReport } from '../models/build-reports.js';
import { htmlReportToObj } from '../scraper/parse-build-reports.js';

const getReportOutputPath = (html: string) => {
  const root = parseHtml(html);
  const readFromHtml = (key: string) => {
    const value = root.querySelector(`#${key}`)?.innerText;
    if (!value) {
      throw new Error(`400 - Could not find value for ${key}`);
    }
    return value;
  };
  const collectionUri = readFromHtml('SYSTEM_COLLECTIONURI');

  const collectionUriParts = collectionUri.split('/');
  const collectionName = collectionUriParts[
    collectionUriParts.length - (collectionUri.endsWith('/') ? 2 : 1)
  ];

  const project = readFromHtml('SYSTEM_TEAMPROJECT');
  const repo = readFromHtml('BUILD_REPOSITORY_NAME');
  const pipelineId = readFromHtml('SYSTEM_DEFINITIONID');
  const branch = readFromHtml('BUILD_SOURCEBRANCHNAME');

  return [
    [process.cwd(), 'build-reports', collectionName, project, repo, pipelineId],
    branch
  ] as const;
};

const saveBuildReportToMongo = async (html: string) => {
  const report = htmlReportToObj(html);
  if (!report) return;
  const { collection, repoName, ...rest } = report;
  return saveBuildReport({
    ...rest,
    collectionName: collection,
    repo: repoName
  });
};

const saveToDisk = async (html: string) => {
  const [directory, fileName] = getReportOutputPath(html);

  await fs.mkdir(join(...directory), { recursive: true });
  await fs.writeFile(join(...directory, `${fileName}.html`), html, 'utf8');
};

export default async (req: expresss.Request, res: expresss.Response) => {
  // TODO: Remove the code to write the build report to disk
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  saveToDisk(req.body);

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
