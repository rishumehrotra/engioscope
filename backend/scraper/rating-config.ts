import { multiply, pipe } from 'ramda';
import {
  inversePercent, ratingFromScore, remainingFrom, qualityGateRating,
  deviation, devsPerTeamPerMonthPlusOne, defaultReducingFactor,
  devsPerTeamPerMonth, percent, devsPerTeamPerDay, percentOutOf100,
  average, inversePercentWith0AsUnfit
} from './stats-aggregators/ratings';
import { Measure } from './types-sonar';
import { divideBy } from '../utils';

type MeasureByName = (name: string) => (x: readonly Measure[]) => string

export const ratingWeightage = {
  Branches: {
    default: 0.25,
    withoutSonar: 0.29
  },
  PR: {
    default: 0.1,
    withoutSonar: 0.14
  },
  Builds: {
    default: 0.15,
    withoutSonar: 0.19
  },
  'Code quality': {
    default: 0.2,
    withoutSonar: 0
  },
  Releases: {
    default: 0.15,
    withoutSonar: 0.19
  },
  'Test coverage': {
    default: 0.15,
    withoutSonar: 0.19
  }
} as const;

export const ratingConfig = {
  codeQuality: {
    complexity: pipe(multiply(0.02), inversePercent),
    bugs: (measureByName: MeasureByName) => (
      pipe(measureByName('reliability_rating'), ratingFromScore)
    ),
    codeSmells: (measureByName: MeasureByName) => (
      pipe(measureByName('squale_rating'), ratingFromScore)
    ),
    vulnerabilities: (measureByName: MeasureByName) => (
      pipe(measureByName('security_rating'), ratingFromScore)
    ),
    duplication: (measureByName: MeasureByName) => (
      pipe(measureByName('duplicated_lines_density'), Number, remainingFrom(100))
    ),
    techDebt: (measureByName: MeasureByName) => (
      pipe(measureByName('sqale_rating'), Number)
    ),
    qualityQate: (measureByName: MeasureByName) => (
      pipe(measureByName('alert_status'), qualityGateRating)
    )
  },
  branches: {
    total: deviation(devsPerTeamPerMonthPlusOne, defaultReducingFactor),
    active: deviation(devsPerTeamPerMonth, defaultReducingFactor),
    stale: deviation(0, defaultReducingFactor),
    abandoned: deviation(0, defaultReducingFactor),
    deleteCandidates: deviation(0, defaultReducingFactor)
  },
  builds: {
    successful: percent(devsPerTeamPerDay),
    numberOfExecutions: percent(devsPerTeamPerDay),
    successRate: percentOutOf100,
    averageDuration: pipe(average, inversePercentWith0AsUnfit(3))
  },
  coverage: {
    successfulTests: percentOutOf100,
    failedTests: deviation(0, defaultReducingFactor),
    testExecutionTime: pipe(divideBy(1000), Math.round, inversePercentWith0AsUnfit(1)),
    branchCoverage: percentOutOf100
  },
  pr: {
    active: inversePercentWith0AsUnfit(devsPerTeamPerMonth),
    abandoned: inversePercent(devsPerTeamPerMonth),
    completed: percent(devsPerTeamPerDay),
    timeToApprove: inversePercentWith0AsUnfit(4)
  },
  releases: {
    lastDeploymentDate: 0,
    totalDeployments: percent(devsPerTeamPerDay),
    successfulDeploymentRate: Math.round,
    nonMasterDeployments: deviation(0, defaultReducingFactor)
  }
};
