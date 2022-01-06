import type { QualityGateDetails, UICodeQuality } from '../../shared/types';

export const combinedQualityGateStatus = (codeQuality: UICodeQuality): QualityGateDetails['status'] => {
  if (!codeQuality) return 'unknown';
  if (codeQuality.every(quality => quality.quality.gate === 'pass')) return 'pass';
  if (codeQuality.some(quality => quality.quality.gate === 'fail')) return 'fail';
  return 'warn';
};
