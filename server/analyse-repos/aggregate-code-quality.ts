import {
  pipe, find, propEq, prop
} from 'ramda';
import { withOverallRating } from './ratings';
import { assertDefined } from '../utils';
import { Measure } from '../types';
import ratingConfig from '../rating-config';
import { TopLevelIndicator } from '../../shared-types';

type MetricDefinition = {
  name: string,
  display: string,
  rating: (s: Measure[]) => number,
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

const measureByName = (name: string) => pipe(
  find<Measure>(propEq('metric', name)), assertDefined, prop('value')
);

const metrics: MetricDefinition[] = [
  {
    name: 'complexity',
    display: 'Complexity',
    rating: measures => {
      const loc = pipe(measureByName('ncloc'), Number)(measures);
      const complexity = pipe(measureByName('complexity'), Number)(measures);
      return ratingConfig.codeQuality.complexity(loc)(complexity);
    }
  },
  {
    name: 'bugs',
    display: 'Bugs',
    rating: ratingConfig.codeQuality.bugs(measureByName)
  },
  {
    name: 'code_smells',
    display: 'Code smells',
    rating: ratingConfig.codeQuality.codeSmells(measureByName)
  },
  {
    name: 'vulnerabilities',
    display: 'Vulnerabilities',
    rating: ratingConfig.codeQuality.vulnerabilities(measureByName)
  },
  {
    name: 'duplicated_lines_density',
    display: 'Duplication',
    rating: ratingConfig.codeQuality.duplication(measureByName)
  },
  {
    name: 'sqale_index',
    display: 'Tech debt',
    rating: ratingConfig.codeQuality.techDebt(measureByName),
    formatter: formatDebt
  },
  {
    name: 'alert_status',
    display: 'Quality gate',
    rating: ratingConfig.codeQuality.techDebt(measureByName)
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
  rating: 0,
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

export default (measures: Measure[] | undefined): AggregagedCodeQuality => {
  if (!measures) return { codeQuality: unknownCodeQuality };

  return {
    languages: formatLoc(measures.find(isMeasureName('ncloc_language_distribution'))?.value),
    codeQuality: withOverallRating({
      name: 'Code quality',
      count: toTitleCase(measures.find(m => m.metric === 'alert_status')?.value || 'Unknown'),
      indicators: metrics.map(metric => {
        const metricValue = measures.find(isMeasureName(metric.name))?.value || '-';
        return {
          name: metric.display,
          rating: metric.rating(measures),
          value: metric.formatter ? metric.formatter(metricValue) : metricValue
        };
      })
    })
  };
};
