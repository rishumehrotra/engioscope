import type { Measure, SonarAnalysisByRepo } from '../types-sonar';
import type { UICodeQuality } from '../../../shared/types';

// Get list of available metrics at <sonar-host>/api/metrics/search
export const requiredMetrics = [
  'complexity',
  'bugs',
  'code_smells',
  'vulnerabilities',
  'duplicated_lines_density',
  'sqale_index',
  'alert_status',
  'security_rating',
  'ncloc_language_distribution',
  'ncloc',
  'sqale_rating',
  'reliability_rating'
];

type AggregagedCodeQuality = {
  codeQuality: UICodeQuality;
  languages?: {lang: string; loc: number}[];
};

const isMeasureName = (name: string) => (measure: Measure) => (
  measure.metric === name
);

const formatLoc = (loc?: string): AggregagedCodeQuality['languages'] => {
  if (!loc) return;
  return loc
    .split(';')
    .map(langGroup => {
      const [lang, loc] = langGroup.split('=');
      return { lang, loc: Number(loc) };
    });
};

export default (sonarAnalysis: SonarAnalysisByRepo): AggregagedCodeQuality => {
  if (!sonarAnalysis) return { codeQuality: null };
  const { measures, url } = sonarAnalysis;

  const findMeasure = (name: string) => measures.find(isMeasureName(name))?.value;

  return {
    languages: formatLoc(measures.find(isMeasureName('ncloc_language_distribution'))?.value),
    codeQuality: {
      url,
      complexity: Number(findMeasure('complexity') || 0),
      bugs: Number(findMeasure('bugs') || 0),
      codeSmells: Number(findMeasure('code_smells') || 0),
      vulnerabilities: Number(findMeasure('vulnerabilities') || 0),
      duplication: Number(findMeasure('duplicated_lines_density') || 0),
      techDebt: Number(findMeasure('sqale_index') || '0'),
      qualityGate: findMeasure('alert_status') as 'error' | 'warn' | 'ok',
      lastAnalysisDate: sonarAnalysis.lastAnalysisDate
    }
  };
};
