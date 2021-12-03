import type { Measure, SonarAnalysisByRepo, SonarQualityGateDetails } from '../types-sonar';
import type { QualityGateDetails, UICodeQuality } from '../../../shared/types';

// Get list of available metrics at <sonar-host>/api/metrics/search
export const requiredMetrics = [
  'blocker_violations',
  'bugs',
  'code_smells',
  'cognitive_complexity',
  'branch_coverage',
  'conditions_to_cover',
  'coverage',
  'critical_violations',
  'complexity',
  'duplicated_blocks',
  'duplicated_files',
  'duplicated_lines',
  'duplicated_lines_density',
  'line_coverage',
  'ncloc',
  'ncloc_language_distribution',
  'lines_to_cover',
  'quality_gate_details',
  'alert_status',
  'reliability_rating',
  'security_rating',
  'team_size',
  'sqale_index',
  'sqale_rating',
  'uncovered_conditions',
  'uncovered_lines',
  'vulnerabilities',
  'files'
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

const qualityGateStatus = (gateLabel?: string): QualityGateDetails['status'] => {
  switch (gateLabel) {
    case 'OK':
      return 'pass';
    case 'WARN':
      return 'warn';
    case 'ERROR':
      return 'fail';
    default:
      return 'unknown';
  }
};

export default (sonarAnalysis: SonarAnalysisByRepo): AggregagedCodeQuality => {
  if (!sonarAnalysis) return { codeQuality: null };
  const { measures, url } = sonarAnalysis;

  const findMeasure = (name: string) => measures.find(isMeasureName(name))?.value;
  const measureAsNumber = (name: string) => {
    const measure = findMeasure(name);
    return measure ? Number(measure) : undefined;
  };

  const qualityGateDetails = JSON.parse(findMeasure('quality_gate_details') || '{}') as SonarQualityGateDetails;
  const qualityGateMetric = (metricName: string) => {
    const metric = qualityGateDetails.conditions.find(({ metric }) => metric === metricName);

    if (!metric) return undefined;

    return {
      value: metric?.actual ? Number(metric.actual) : undefined,
      op: metric?.op ? metric.op.toLowerCase() as 'gt' | 'lt' : undefined,
      level: metric?.error ? Number(metric.error) : undefined,
      status: qualityGateStatus(metric.level)
    };
  };

  return {
    languages: formatLoc(measures.find(isMeasureName('ncloc_language_distribution'))?.value),
    codeQuality: {
      url,
      lastAnalysisDate: sonarAnalysis.lastAnalysisDate,
      files: measureAsNumber('files'),
      complexity: {
        cyclomatic: measureAsNumber('complexity'),
        cognitive: measureAsNumber('cognitive_complexity')
      },
      quality: {
        gate: qualityGateStatus(qualityGateDetails.level),
        securityRating: qualityGateMetric('security_rating'),
        coverage: qualityGateMetric('coverage'),
        duplicatedLinesDensity: qualityGateMetric('duplicated_lines_density'),
        blockerViolations: qualityGateMetric('blocker_violations'),
        codeSmells: qualityGateMetric('code_smells'),
        criticalViolations: qualityGateMetric('critical_violations')
      },
      coverage: {
        byTests: measureAsNumber('coverage'),
        line: measureAsNumber('line_coverage'),
        linesToCover: measureAsNumber('lines_to_cover'),
        uncoveredLines: measureAsNumber('uncovered_lines'),
        branch: measureAsNumber('branch_coverage'),
        conditionsToCover: measureAsNumber('conditions_to_cover'),
        uncoveredConditions: measureAsNumber('uncovered_conditions')
      },
      reliability: {
        bugs: measureAsNumber('bugs'),
        rating: measureAsNumber('reliability_rating'),
        vulnerabilities: measureAsNumber('vulnerabilities')
      },
      duplication: {
        blocks: measureAsNumber('duplicated_blocks'),
        files: measureAsNumber('duplicated_files'),
        lines: measureAsNumber('duplicated_lines'),
        linesDensity: measureAsNumber('duplicated_lines_density')
      },
      maintainability: {
        rating: measureAsNumber('sqale_rating'),
        techDebt: measureAsNumber('sqale_index'),
        codeSmells: measureAsNumber('code_smells')
      }
    }
  };
};
