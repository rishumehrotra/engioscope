import { Measure } from '../types-sonar';
import { TopLevelIndicator } from '../../../shared/types';

type MetricDefinition = {
  name: string,
  display: string,
  formatter?: (s: string) => string,
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

const unknownCodeQuality: TopLevelIndicator = {
  name: 'Code quality',
  count: 'Unknown',
  indicators: metrics.map(metric => ({
    name: metric.display,
    rating: 10,
    value: '-'
  }))
};

type AggregagedCodeQuality = {
  codeQuality: TopLevelIndicator,
  languages?: Record<string, string>
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

const toTitleCase = (str: string) => str.replace(
  /\w\S*/g,
  txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
);

export default (measures: Measure[]): AggregagedCodeQuality => {
  if (!measures.length) return { codeQuality: unknownCodeQuality };

  return {
    languages: formatLoc(measures.find(isMeasureName('ncloc_language_distribution'))?.value),
    codeQuality: {
      name: 'Code quality',
      count: toTitleCase(measures.find(m => m.metric === 'alert_status')?.value || 'Unknown'),
      indicators: metrics.map(metric => {
        const metricValue = measures.find(isMeasureName(metric.name))?.value || '-';
        return {
          name: metric.display,
          value: metric.formatter ? metric.formatter(metricValue) : metricValue
        };
      })
    }
  };
};
