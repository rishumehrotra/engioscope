import React from 'react';
import type { RepoAnalysis } from '../../../shared/types';
import { formatDebt, num, shortDate } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import Metric from '../Metric';
import TabContents from './TabContents';

export default (codeQuality: RepoAnalysis['codeQuality']): Tab => ({
  title: 'Code quality',
  count: codeQuality?.qualityGate || 'unknown',
  content: () => (
    codeQuality ? (
      <TabContents gridCols={1}>
        <div className="grid grid-cols-7">
          <Metric name="Complexity" value={num(codeQuality.complexity)} position="first" />
          <Metric name="Bugs" value={num(codeQuality.bugs)} />
          <Metric name="Code smells" value={num(codeQuality.codeSmells)} />
          <Metric name="Vulnerabilities" value={num(codeQuality.vulnerabilities)} />
          <Metric name="Duplication" value={num(codeQuality.duplication)} />
          <Metric name="Tech debt" value={formatDebt(codeQuality.techDebt)} />
          <Metric name="Quality gate" value={codeQuality.qualityGate} position="last" />
        </div>
        <div className="flex justify-between text-sm italic mt-4">
          <div className="text-gray-600">
            {`Last analysis was run on ${shortDate(new Date(codeQuality.lastAnalysisDate))}.`}
          </div>
          <div className="items-end">
            <a
              className="link-text"
              href={codeQuality.url}
              target="_blank"
              rel="noreferrer"
            >
              See full details on SonarQube
            </a>
          </div>
        </div>
      </TabContents>
    ) : (<TabContents gridCols={0}><AlertMessage message="Couldn't find this repo on SonarQube" /></TabContents>)
  )
});
