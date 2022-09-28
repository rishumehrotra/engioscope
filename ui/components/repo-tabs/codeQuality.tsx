import React, { useState } from 'react';
import { pipe } from 'rambda';
import type { RepoAnalysis, UICodeQuality } from '../../../shared/types.js';
import { formatDebt, num, shortDate } from '../../helpers/utils.js';
import AlertMessage from '../common/AlertMessage.js';
import type { Tab } from './Tabs.js';
import TabContents from './TabContents.js';
import { combinedQualityGateStatus } from '../code-quality-utils.js';

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
  }
};

type SubCardProps = {
  heading: string;
  rating?: string;
  ratingClassName?: string;
  className?: string;
  children?: React.ReactNode;
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
        <div className="-mt-7 mb-5 pl-1 text-xs text-gray-600">
          {'Using '}
          <strong className="font-semibold">{codeQuality.qualityGateName}</strong>
        </div>
        <table className="w-full">
          <tbody>
            {fieldDefinitions.qualityGate
              .filter(({ key }) => codeQuality.quality[key] !== undefined)
              .map(({ key, label, formatter }, index) => {
                const match = codeQuality.quality[key];
                if (!match) return null;
                return (
                  <tr key={key} className={index % 2 === 0 ? '' : 'bg-gray-100'}>
                    <td className="p-1 align-top">
                      {label}
                      {match.op && match.level && (
                        <div className="text-gray-600 text-xs">
                          {`Should not be ${match.op === 'gt' ? 'above' : 'below'} ${formatter(match.level)}`}
                        </div>
                      )}
                    </td>
                    <td className="p-1 pr-3 font-semibold align-middle text-right">{formatter(match.value || 0)}</td>
                    <td className="p-1 align-middle text-right">
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
                      <td className="p-1 font-semibold text-right">{formatter(match)}</td>
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
                      <td className="p-1 font-semibold text-right">{formatter(match)}</td>
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
                      <td className="p-1 font-semibold text-right">{formatter(match)}</td>
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
                      <td className="p-1 font-semibold text-right">{formatter(match)}</td>
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
        {codeQuality.lastAnalysisDate
          ? `Last analysis was run on ${shortDate(new Date(codeQuality.lastAnalysisDate))}.`
          : 'Analysis has never been run'}
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

const AnalysisTable: React.FC<{ codeQuality: NonNullable<UICodeQuality>}> = ({ codeQuality }) => {
  const [expandedRows, setExpandedRows] = useState<NonNullable<UICodeQuality>>([]);

  return (
    <table className="table-auto text-center divide-y divide-gray-200 w-full">
      <thead>
        <tr>
          <th className="px-6 py-3 text-xs w-2/6 font-medium text-gray-800 uppercase tracking-wider"> </th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Quality gate</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Maintainability</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Reliability</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Security</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Coverage</th>
          <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider">Duplications</th>
        </tr>
      </thead>
      <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
        {codeQuality.map(codeQualityItem => (
          <>
            <tr
              key={codeQualityItem.url}
              className="group cursor-pointer"
              onClick={() => {
                if (expandedRows.includes(codeQualityItem)) {
                  setExpandedRows(expandedRows.filter(item => item !== codeQualityItem));
                } else {
                  setExpandedRows([...expandedRows, codeQualityItem]);
                }
              }}
            >
              <td className="pl-6 py-4 whitespace-nowrap text-left text-blue-600 group-hover:underline">
                <span className="truncate w-full block">
                  {codeQualityItem.name}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`text-center text-xs px-4 py-1 rounded-lg shadow-sm font-semibold
                  ${gateClassName(codeQualityItem.quality.gate)}`}
                >
                  {codeQualityItem.quality.gate.toUpperCase()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`text-center text-xs px-4 py-1 rounded-lg shadow-sm font-semibold
                  ${ratingClassName(rating(codeQualityItem.maintainability.rating))}`}
                >
                  {rating(codeQualityItem.maintainability.rating)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`text-center text-xs px-4 py-1 rounded-lg shadow-sm font-semibold
                  ${ratingClassName(rating(codeQualityItem.reliability.rating))}`}
                >
                  {rating(codeQualityItem.reliability.rating)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`text-center text-xs px-4 py-1 rounded-lg shadow-sm font-semibold
                  ${ratingClassName(rating(codeQualityItem.security.rating))}`}
                >
                  {rating(codeQualityItem.security.rating)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className="text-center px-4 py-1 rounded-lg shadow-sm font-semibold"
                >
                  {codeQualityItem.coverage.byTests !== undefined ? percent(codeQualityItem.coverage.byTests) : 'unknown'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className="text-center px-4 py-1 rounded-lg shadow-sm font-semibold"
                >
                  {codeQualityItem.duplication.linesDensity !== undefined ? percent(codeQualityItem.duplication.linesDensity) : 'unknown'}
                </span>
              </td>
            </tr>
            {expandedRows.includes(codeQualityItem) && (
              <tr>
                <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-left bg-gray-100 ml-2">
                  <SingleAnalysis codeQuality={codeQualityItem} />
                </td>
              </tr>
            )}
          </>
        ))}
      </tbody>
    </table>
  );
};

const tabLabel = (codeQuality: RepoAnalysis['codeQuality']) => {
  const state = combinedQualityGateStatus(codeQuality);
  if (state !== 'fail') return state;
  if (codeQuality?.length === 1) return state;

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const warnCount = codeQuality!.filter(q => q.quality.gate === 'fail').length;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return `${Math.round((warnCount * 100) / codeQuality!.length)}% fail`;
};

export default (codeQuality: RepoAnalysis['codeQuality']): Tab => ({
  title: 'Code quality',
  count: tabLabel(codeQuality),
  Component: () => (
    codeQuality ? (
      <TabContents gridCols={1}>
        {codeQuality.length === 1 ? (
          <SingleAnalysis codeQuality={codeQuality[0]} key={codeQuality[0].url} />
        ) : (
          <AnalysisTable codeQuality={codeQuality} />
        )}
      </TabContents>
    ) : (
      <TabContents gridCols={0}>
        <AlertMessage message="Couldn't find this repo on SonarQube" />
      </TabContents>
    )
  )
});
