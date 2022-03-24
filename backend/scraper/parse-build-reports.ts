
import { parse as parseHtml } from 'node-html-parser';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { glob } from 'glob';
import { exists, normalizeBranchName } from '../utils';

const globAsync = promisify(glob);

const parseReport = async (fileName: string) => {
  let htmlContent: string;

  try {
    htmlContent = await fs.readFile(fileName, 'utf-8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error parsing build report', e);
    return null;
  }

  const root = parseHtml(htmlContent);
  const read = (selector: string) => root.querySelector(`#${selector}`)?.innerText;

  return {
    sonarHost: read('sonarHost'),
    sonarProjectKey: read('sonarProjectKey'),
    collection: read('SYSTEM_COLLECTIONURI')?.split('/')[3],
    collectionId: read('SYSTEM_COLLECTIONID'),
    project: read('SYSTEM_TEAMPROJECT'),
    repoName: read('BUILD_REPOSITORY_NAME'),
    repoId: read('BUILD_REPOSITORY_ID'),
    branch: read('BUILD_SOURCEBRANCH'),
    branchName: read('BUILD_SOURCEBRANCHNAME'),
    agentName: read('AGENT_NAME'),
    buildId: read('BUILD_BUILDID'),
    buildDefinitionId: read('SYSTEM_DEFINITIONID'),
    buildReason: read('BUILD_REASON')
  };
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
