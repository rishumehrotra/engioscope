import { parse as parseHtml } from 'node-html-parser';
import { decode } from 'html-entities';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import { normalizeBranchName } from '../utils.js';
import { exists } from '../../shared/utils.js';
import type { AzureBuildReport } from '../models/build-reports.js';

export const htmlReportToObj = (htmlContent: string) => {
  const root = parseHtml(htmlContent);
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  const read = (selector: string) => root.querySelector(`#${selector}`)?.innerText;
  const buildScript = read('buildScript');

  const centralTemplate: Record<string, string> = Object.fromEntries(
    [...root.querySelectorAll('#central_template [data-key]')]
      // eslint-disable-next-line unicorn/prefer-dom-node-dataset, unicorn/prefer-dom-node-text-content
      .map(el => [decode(el.getAttribute('data-key')), decode(el.innerText)] as const)
      .filter(([key, value]) => key?.trim() !== '' && value?.trim() !== '')
  );

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
    agentName: read('AGENT_NAME'),
    buildScript: buildScript ? decode(buildScript) : undefined,
    centralTemplate: Object.keys(centralTemplate).length ? centralTemplate : undefined,
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

export default (collectionName: string, projectName: string) =>
  async (repoName: string, branchName: string) => {
    const buildReportDir = join(
      process.cwd(),
      'build-reports',
      collectionName,
      projectName,
      repoName
    );
    const matchingBuildReportFiles = await glob(
      join(buildReportDir, '**', `${normalizeBranchName(branchName)}.html`)
    );

    return (await Promise.all(matchingBuildReportFiles.map(parseReport))).filter(exists);
  };
