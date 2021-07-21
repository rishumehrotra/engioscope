import { lens } from '@rakeshpai/lens.ts';
import { applySpec, pipe } from 'rambda';

export type OTWCodeQuality = [
  complexity: number,
  bugs: number,
  codeSmells: number,
  vulnerabilities: number,
  duplication: number,
  techDebt: string,
  qualityGate: 0 | 1 | 2 | 3
];

export type UICodeQuality = {
  complexity: number;
  bugs: number;
  codeSmells: number;
  vulnerabilities: number;
  duplication: number;
  techDebt: string;
  qualityGate: 'error' | 'warn' | 'ok' | 'unknown';
};

const codeQualityLens = lens<OTWCodeQuality>();

const complexityLens = codeQualityLens[0];
const bugsLens = codeQualityLens[1];
const codeSmellsLens = codeQualityLens[2];
const vulnerabilitiesLens = codeQualityLens[3];
const duplicationLens = codeQualityLens[4];
const techDebtLens = codeQualityLens[5];
const qualityGateLens = lens<OTWCodeQuality, UICodeQuality['qualityGate']>(
  codeQuality => {
    switch (codeQuality[6]) {
      case 0: return 'error';
      case 1: return 'warn';
      case 2: return 'ok';
      default: return 'unknown';
    }
  },
  qualityGate => codeQuality => {
    const c: OTWCodeQuality = [...codeQuality];
    if (qualityGate === 'error') c[6] = 0;
    else if (qualityGate === 'warn') c[6] = 1;
    else if (qualityGate === 'ok') c[6] = 2;
    else c[6] = 3;
    return c;
  }
);

export const viewCodeQuality = (codeQuality: OTWCodeQuality) => applySpec<UICodeQuality>({
  complexity: complexityLens.get(),
  bugs: bugsLens.get(),
  codeSmells: codeSmellsLens.get(),
  vulnerabilities: vulnerabilitiesLens.get(),
  duplication: duplicationLens.get(),
  techDebt: techDebtLens.get(),
  qualityGate: qualityGateLens.get()
})(codeQuality);

export const setCodeQuality = (codeQuality: UICodeQuality) => pipe(
  complexityLens.set(codeQuality.complexity),
  bugsLens.set(codeQuality.bugs),
  codeSmellsLens.set(codeQuality.codeSmells),
  vulnerabilitiesLens.set(codeQuality.vulnerabilities),
  duplicationLens.set(codeQuality.duplication),
  techDebtLens.set(codeQuality.techDebt),
  qualityGateLens.set(codeQuality.qualityGate)
);
