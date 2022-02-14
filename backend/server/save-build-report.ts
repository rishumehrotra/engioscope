import type expresss from 'express';
import { parse as parseHtml } from 'node-html-parser';
import { promises as fs } from 'fs';
import { join } from 'path';

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

export default async (req: expresss.Request, res: expresss.Response) => {
  try {
    const { html } = req.body;
    const [directory, fileName] = getReportOutputPath(html);

    await fs.mkdir(join(...directory), { recursive: true });
    await fs.writeFile(join(...directory, `${fileName}.html`), html, 'utf8');

    res.sendStatus(200);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('400')) {
      res.status(400).send(e.message.replace('400 - ', ''));
      return;
    }
    // eslint-disable-next-line no-console
    console.error('Error saving build report html', e);
    res.status(500).send(e);
  }
};
