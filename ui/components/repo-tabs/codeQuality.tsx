import React from 'react';
import { pipe } from 'rambda';
import type { RepoAnalysis, UICodeQuality } from '../../../shared/types';
import { formatDebt, num, shortDate } from '../../helpers/utils';
import AlertMessage from '../common/AlertMessage';
import type { Tab } from './Tabs';
import TabContents from './TabContents';

// https://docs.sonarqube.org/latest/user-guide/metric-definitions/

const percent = pipe(num, n => `${n}%`);
const rating = (rating: number | undefined) => {
  if (rating === undefined) return 'unknown';
  if (rating <= 1) return 'A';
  if (rating <= 2) return 'B';
  if (rating <= 3) return 'C';
  if (rating <= 4) return 'D';
  return 'E';
};

const fieldDefinitions = {
  qualityGate: [
    {
      key: 'securityRating',
      label: 'Security rating',
      formatter: rating
    },
    {
      key: 'coverage',
      label: 'Coverage',
      formatter: percent
    },
    {
      key: 'duplicatedLinesDensity',
      label: 'Duplicated lines density',
      formatter: percent
    },
    {
      key: 'blockerViolations',
      label: 'Blocker violations',
      formatter: num
    },
    {
      key: 'codeSmells',
      label: 'Code smells',
      formatter: num
    },
    {
      key: 'criticalViolations',
      label: 'Critical violations',
      formatter: num
    }
  ],
  complexity: [
    {
      key: 'cognitive',
      label: 'Cognitive Complexity',
      formatter: num
    },
    {
      key: 'cyclomatic',
      label: 'Cyclomatic Complexity',
      formatter: num
    }
  ],
  reliability: [
    {
      key: 'bugs',
      label: 'Bugs',
      formatter: num
    }
  ],
  security: [
    {
      key: 'vulnerabilities',
      label: 'Vulnerabilities',
      formatter: num
    }
  ],
  duplications: [
    {
      key: 'blocks',
      label: 'Duplicated blocks',
      formatter: num
    },
    {
      key: 'lines',
      label: 'Duplicated lines',
      formatter: num
    },
    {
      key: 'files',
      label: 'Files with duplications',
      formatter: num
    }
  ],
  maintainability: [
    {
      key: 'techDebt',
      label: 'Technical Debt',
      formatter: formatDebt
    },
    {
      key: 'codeSmells',
      label: 'Code smells',
      formatter: num
    }
  ]
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const reliabilityRatingMeaning = {
  A: 'No bugs',
  B: 'At least 1 minor bug',
  C: 'At least 1 major bug',
  D: 'At least 1 critical bug',
  E: 'At least 1 blocker bug'
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const securityRatingMeaning = {
  A: 'No vulnerabilities',
  B: 'At least 1 minor vulnerability',
  C: 'At least 1 major vulnerability',
  D: 'At least 1 critical vulnerability',
  E: 'At least 1 blocker vulnerability'
};

const ratingClassName = (ratingValue: ReturnType<typeof rating>) => {
  switch (ratingValue) {
    case 'A':
      return 'text-white bg-green-700';
    case 'B':
    case 'C':
      return 'text-white bg-yellow-600';
    case 'D':
    case 'E':
      return 'text-white bg-red-500';
    default:
      return undefined;
  }
};

const gateClassName = (gate: NonNullable<RepoAnalysis['codeQuality']>[number]['quality']['gate']) => {
  switch (gate) {
    case 'pass':
      return 'text-green-800 bg-green-200';
    case 'fail':
      return 'text-red-800 bg-red-100';
    case 'warn':
      return 'text-yellow-800 bg-yellow-100';
    default:
      return undefined;
  }
};

type SubCardProps = {
  heading: string;
  rating?: string;
  ratingClassName?: string;
  className?: string;
};

const SubCard: React.FC<SubCardProps> = ({
  heading, rating, ratingClassName, children, className
}) => (
  <div className={`bg-gray-50 rounded-lg shadow-sm ${className || ''}`}>
    <div className="flex justify-between py-4">
      <h2 className="text-xl font-semibold px-4">{heading}</h2>
      {rating !== undefined && (
        <div
          className={`text-center px-4 py-1 rounded-l-lg shadow-sm font-semibold
            ${ratingClassName || 'bg-purple-600 text-lg text-white'}`}
          style={{ minWidth: '3em' }}
        >
          {rating}
        </div>
      )}
    </div>
    <div className="m-3">
      {children}
    </div>
  </div>
);

const SingleAnalysis: React.FC<{ codeQuality: NonNullable<UICodeQuality>[number]}> = ({ codeQuality }) => (
  <>
    <div className="grid grid-cols-3 gap-4">
      <SubCard
        heading="Quality gates"
        rating={codeQuality.quality.gate.toUpperCase()}
        ratingClassName={`${gateClassName(codeQuality.quality.gate)}`}
        className="row-span-2"
      >
        <table className="w-full">
          <tbody>
            {fieldDefinitions.qualityGate
              .filter(({ key }) => codeQuality.quality[key] !== undefined)
              .map(({ key, label, formatter }, index) => {
                const match = codeQuality.quality[key];
                if (!match) return null;
                return (
                  <tr key={key} className={index % 2 === 0 ? '' : 'bg-gray-100'}>
                    <td valign="top" className="p-1">
                      {label}
                      {match.op && match.level && (
                        <div className="text-gray-600 text-xs">
                          {`Should not be ${match.op === 'gt' ? 'above' : 'below'} ${formatter(match.level)}`}
                        </div>
                      )}
                    </td>
                    <td valign="middle" align="right" className="p-1 pr-3 font-semibold">{formatter(match.value || 0)}</td>
                    <td valign="middle" align="right" className="p-1">
                      <div className={`py-1 text-xs rounded-md text-center ${gateClassName(match.status)}`}>
                        {match.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <div className="text-xs text-gray-600 mt-4 p-1">
          Some quality gates are not shown.
        </div>
      </SubCard>
      <div className="col-span-2 grid grid-cols-3 gap-4">
        <SubCard
          heading="Maintainability"
          rating={rating(codeQuality.maintainability.rating) === 'unknown' ? undefined : rating(codeQuality.maintainability.rating)}
          ratingClassName={ratingClassName(rating(codeQuality.maintainability.rating))}
        >
          <table className="w-full">
            <tbody>
              {fieldDefinitions.maintainability
                .filter(({ key }) => codeQuality.maintainability[key] !== undefined)
                .map(({ key, label, formatter }) => {
                  const match = codeQuality.maintainability[key];
                  if (match === undefined) return null;
                  return (
                    <tr key={key}>
                      <td className="p-1">{label}</td>
                      <td align="right" className="p-1 font-semibold">{formatter(match)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </SubCard>
        <SubCard
          heading="Reliability"
          rating={rating(codeQuality.reliability.rating)}
          ratingClassName={ratingClassName(rating(codeQuality.reliability.rating))}
        >
          <table className="w-full">
            <tbody>
              {fieldDefinitions.reliability
                .filter(({ key }) => codeQuality.reliability[key] !== undefined)
                .map(({ key, label, formatter }) => {
                  const match = codeQuality.reliability[key];
                  if (match === undefined) return null;
                  return (
                    <tr key={key}>
                      <td className="p-1">{label}</td>
                      <td align="right" className="p-1 font-semibold">{formatter(match)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </SubCard>
        <SubCard
          heading="Security"
          rating={rating(codeQuality.security.rating)}
          ratingClassName={ratingClassName(rating(codeQuality.security.rating))}
        >
          <table className="w-full">
            <tbody>
              {fieldDefinitions.security
                .filter(({ key }) => codeQuality.security[key] !== undefined)
                .map(({ key, label, formatter }) => {
                  const match = codeQuality.security[key];
                  if (match === undefined) return null;
                  return (
                    <tr key={key}>
                      <td className="p-1">{label}</td>
                      <td align="right" className="p-1 font-semibold">{formatter(match)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </SubCard>
      </div>
      <div className="col-span-2 grid grid-cols-3 gap-4">
        <SubCard
          heading="Coverage"
          rating={codeQuality.coverage.byTests !== undefined ? percent(codeQuality.coverage.byTests) : undefined}
        >
          {(codeQuality.coverage.line === undefined && codeQuality.coverage.branch === undefined)
            ? (
              <div className="text-gray-600 text-sm px-1">
                No coverage data available
              </div>
            )
            : (
              <table className="w-full">
                <tbody>
                  {([
                    {
                      label: 'Line coverage', stat: 'line', uncovered: 'uncoveredLines', toCover: 'linesToCover'
                    },
                    {
                      label: 'Branch coverage', stat: 'branch', uncovered: 'uncoveredConditions', toCover: 'conditionsToCover'
                    }
                  ] as const)
                    .filter(({ stat }) => codeQuality.coverage[stat] !== undefined)
                    .map(({
                      label, stat, uncovered, toCover
                    }) => {
                      if (codeQuality.coverage[stat] === undefined) return null;
                      return (
                        <React.Fragment key={stat}>
                          <tr>
                            <td className={`px-1 pt-1 ${codeQuality.coverage[uncovered] !== undefined ? '' : 'pb-1'}`}>{label}</td>
                            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                            <td className="text-right p-1 font-semibold">{percent(codeQuality.coverage[stat]!)}</td>
                          </tr>
                          {codeQuality.coverage[uncovered] !== undefined && (
                            <tr>
                              <td colSpan={2} className="px-1 pb-1 text-xs text-gray-600">
                                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                                {`${num(codeQuality.coverage[uncovered]!)} ${
                                  codeQuality.coverage[toCover] !== undefined
                                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                    ? ` of ${num(codeQuality.coverage[toCover]!)}`
                                    : ''
                                } to be covered`}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            )}
        </SubCard>
        <SubCard
          heading="Duplications"
          rating={codeQuality.duplication.linesDensity !== undefined ? percent(codeQuality.duplication.linesDensity) : undefined}
        >
          <table className="w-full">
            <tbody>
              {fieldDefinitions.duplications
                .filter(({ key }) => codeQuality.duplication[key] !== undefined)
                .map(({ key, label, formatter }) => {
                  const match = codeQuality.duplication[key];
                  if (match === undefined) return null;
                  return (
                    <tr key={key}>
                      <td className="p-1">{label}</td>
                      <td align="right" className="p-1 font-semibold">{formatter(match)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </SubCard>
        <SubCard heading="Complexity">
          {
            fieldDefinitions.complexity
              .filter(({ key }) => codeQuality.complexity[key] !== undefined)
              .length === 0
              ? (
                <div className="text-gray-600 text-sm px-1">
                  No complexity data available
                </div>
              )
              : (
                <table className="w-full">
                  <tbody>
                    {fieldDefinitions.complexity.map(({ key, label, formatter }) => {
                      const match = codeQuality.complexity[key];
                      if (match === undefined) return null;
                      return (
                        <tr key={key}>
                          <td className="p-1">{label}</td>
                          <td className="text-right p-1 font-semibold">{formatter(match)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
          }
        </SubCard>
      </div>
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
  </>
);

export default (codeQuality: RepoAnalysis['codeQuality']): Tab => ({
  title: 'Code quality',
  count: codeQuality?.[0].quality.gate || 'unknown',
  content: () => (
    codeQuality ? (
      <TabContents gridCols={1}>
        {codeQuality.map(codeQualityItem => (
          <SingleAnalysis codeQuality={codeQualityItem} key={codeQualityItem.url} />
        ))}
      </TabContents>
    ) : (
      <TabContents gridCols={0}>
        <AlertMessage message="Couldn't find this repo on SonarQube" />
      </TabContents>
    )
  )
});
