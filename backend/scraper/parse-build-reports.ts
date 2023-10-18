import { parse as parseHtml } from 'node-html-parser';
import { decode } from 'html-entities';
import { relative } from 'node:path';
import type { AzureBuildReport } from '../models/build-reports.js';

export const htmlReportToObj = (htmlContent: string) => {
  const root = parseHtml(htmlContent);
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  const read = (id: string) => root.querySelector(`#${id}`)?.innerText.trim();
  const buildScript = read('buildScript');

  const centralTemplate: Record<string, string> = Object.fromEntries(
    [...root.querySelectorAll('#central_template [data-key]')]
      // eslint-disable-next-line unicorn/prefer-dom-node-dataset, unicorn/prefer-dom-node-text-content
      .map(el => [decode(el.getAttribute('data-key')), decode(el.innerText)] as const)
      .filter(([key, value]) => key?.trim() !== '' && value?.trim() !== '')
  );

  const specmaticCoverageString = read('specmaticCoverage');
  const specmaticStubUsageString = read('specmaticStubUsage');
  const specmaticCentralRepoReportString = read('specmaticCentralRepoReport');
  const agentGitRoot = read('BUILD_SOURCESDIRECTORY');

  const specmaticCoverage = specmaticCoverageString
    ? JSON.parse(decode(specmaticCoverageString))
    : undefined;

  const specmaticStubUsage = specmaticStubUsageString
    ? JSON.parse(decode(specmaticStubUsageString))
    : undefined;

  const specmaticCentralRepoReport = specmaticCentralRepoReportString
    ? JSON.parse(decode(specmaticCentralRepoReportString))
    : undefined;

  const specmaticConfigPath = () => {
    if (!agentGitRoot) return;
    if (!specmaticCoverage && !specmaticStubUsage) return;

    return relative(
      agentGitRoot,
      (specmaticCoverage || specmaticStubUsage)?.specmaticConfigPath as string
    );
  };

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  return {
    sonarHost: read('sonarHost'),
    sonarProjectKey: read('sonarProjectKey'),
    collection: read('SYSTEM_COLLECTIONURI')!.split('/')[3],
    collectionId: read('SYSTEM_COLLECTIONID')!,
    project: read('SYSTEM_TEAMPROJECT')!,
    repoName: read('BUILD_REPOSITORY_NAME')!,
    repoId: read('BUILD_REPOSITORY_ID')!,
    repoUrl: read('BUILD_REPOSITORY_URI')!,
    branch: read('BUILD_SOURCEBRANCH')!,
    branchName: read('BUILD_SOURCEBRANCHNAME')!,
    buildId: read('BUILD_BUILDID')!,
    buildDefinitionId: read('SYSTEM_DEFINITIONID')!,
    buildReason: read('BUILD_REASON')! as AzureBuildReport['buildReason'],
    agentName: read('AGENT_NAME'),
    buildScript: buildScript ? decode(buildScript) : undefined,
    centralTemplate: Object.keys(centralTemplate).length ? centralTemplate : undefined,
    specmaticConfigPath: specmaticConfigPath(),
    specmaticCoverage:
      specmaticCoverage?.apiCoverage as AzureBuildReport['specmaticCoverage'],
    specmaticStubUsage:
      specmaticStubUsage?.stubUsage as AzureBuildReport['specmaticStubUsage'],
    specmaticCentralRepoReport:
      specmaticCentralRepoReport?.specifications as AzureBuildReport['specmaticCentralRepoReport'],
  };
  /* eslint-enable */
};
