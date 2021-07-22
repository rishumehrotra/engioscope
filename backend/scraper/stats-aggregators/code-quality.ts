import { Measure } from '../types-sonar';
import { UICodeQuality } from '../../../shared/types';

type MetricDefinition = {
  name: string;
  display: string;
  formatter?: (s: string) => string;
};

const formatDebt = (debt: string) => {
  const debtNumber = Number(debt);
  if (debtNumber > 60 && debtNumber < (60 * 24)) {
    return `${Math.ceil((debtNumber / 60))} hrs`;
  } if (debtNumber > 24 * 60) {
    return `${Math.ceil((debtNumber / (60 * 8)))} days`;
  }
  return `${debtNumber} mins`;
};

const metrics: MetricDefinition[] = [
  {
    name: 'complexity',
    display: 'Complexity'
  },
  {
    name: 'bugs',
    display: 'Bugs'
  },
  {
    name: 'code_smells',
    display: 'Code smells'
  },
  {
    name: 'vulnerabilities',
    display: 'Vulnerabilities'
  },
  {
    name: 'duplicated_lines_density',
    display: 'Duplication'
  },
  {
    name: 'sqale_index',
    display: 'Tech debt',
    formatter: formatDebt
  },
  {
    name: 'alert_status',
    display: 'Quality gate'
  }
];

export const requiredMetrics = [
  ...metrics.map(n => n.name),
  'security_rating',
  'ncloc_language_distribution',
  'ncloc',
  'sqale_rating',
  'reliability_rating'
];

type AggregagedCodeQuality = {
  codeQuality: UICodeQuality;
  languages?: Record<string, string>;
};

const isMeasureName = (name: string) => (measure: Measure) => (
  measure.metric === name
);

const formatLoc = (loc?: string): Record<string, string> | undefined => {
  if (!loc) return;
  return loc
    .split(';')
    .reduce((acc, langGroup) => {
      const [lang, lines] = langGroup.split('=');
      const loc = Number(lines);

      return {
        ...acc,
        [lang]: (loc > 1000) ? `${loc / 1000}k` : loc.toString()
      };
    }, {});
};

export default (measures: Measure[]): AggregagedCodeQuality => {
  if (!measures.length) return { codeQuality: null };

  const findMeasure = (name: string) => measures.find(isMeasureName(name))?.value;

  return {
    languages: formatLoc(measures.find(isMeasureName('ncloc_language_distribution'))?.value),
    codeQuality: {
      complexity: Number(findMeasure('complexity') || 0),
      bugs: Number(findMeasure('bugs') || 0),
      codeSmells: Number(findMeasure('code_smells') || 0),
      vulnerabilities: Number(findMeasure('vulnerabilities') || 0),
      duplication: Number(findMeasure('duplicated_lines_density') || 0),
      techDebt: formatDebt(findMeasure('sqale_index') || '0'),
      qualityGate: findMeasure('alert_status') as 'error' | 'warn' | 'ok'
    }
  };
};
