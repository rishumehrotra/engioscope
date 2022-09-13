import { parse as parseHtml } from 'node-html-parser';
import { decode } from 'html-entities';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import glob from 'glob';
import { normalizeBranchName } from '../utils.js';
import { exists } from '../../shared/utils.js';
import type { AzureBuildReport } from '../db/build-reports.js';

const globAsync = promisify(glob.glob);

export const htmlReportToObj = (htmlContent: string) => {
  const root = parseHtml(htmlContent);
  const read = (selector: string) => root.querySelector(`#${selector}`)?.innerText;
  const buildScript = read('buildScript');

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  return {
    sonarHost: read('sonarHost'),
    sonarProjectKey: read('sonarProjectKey'),
    collection: read('SYSTEM_COLLECTIONURI')!.split('/')[3],
    collectionId: read('SYSTEM_COLLECTIONID')!,
    project: read('SYSTEM_TEAMPROJECT')!,
    repoName: read('BUILD_REPOSITORY_NAME')!,
    repoId: read('BUILD_REPOSITORY_ID')!,
    branch: read('BUILD_SOURCEBRANCH')!,
    branchName: read('BUILD_SOURCEBRANCHNAME')!,
    buildId: read('BUILD_BUILDID')!,
    buildDefinitionId: read('SYSTEM_DEFINITIONID')!,
    buildReason: read('BUILD_REASON')! as AzureBuildReport['buildReason'],
    buildScript: buildScript ? decode(buildScript) : undefined
  };
  /* eslint-enable */
};

const parseReport = async (fileName: string) => {
  let htmlContent: string;

  try {
    htmlContent = await fs.readFile(fileName, 'utf8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error parsing build report', error);
    return null;
  }

  return htmlReportToObj(htmlContent);
};

export default (collectionName: string, projectName: string) => (
  async (repoName: string, branchName: string) => {
    const buildReportDir = join(process.cwd(), 'build-reports', collectionName, projectName, repoName);
    const matchingBuildReportFiles = await globAsync(join(buildReportDir, '**', `${normalizeBranchName(branchName)}.html`));

    return (
      (await Promise.all(matchingBuildReportFiles.map(parseReport)))
        .filter(exists)
    );
  }
);
