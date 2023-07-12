import React, { useState, Fragment } from 'react';
import { pipe } from 'rambda';
import { twJoin } from 'tailwind-merge';
import { CheckCircle, ChevronRight, XCircle } from 'react-feather';
import type { UICodeQuality2 } from '../../../shared/types.js';
import { formatDebt, num, shortDate } from '../../helpers/utils.js';
import AlertMessage from '../common/AlertMessage.jsx';
import type { Tab } from './Tabs.jsx';
import TabContents from './TabContents.jsx';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import Loading from '../Loading.jsx';
import { capitalizeFirstLetter } from '../../../shared/utils.js';
import AnimateHeight from '../common/AnimateHeight.jsx';

// https://docs.sonarqube.org/latest/user-guide/metric-definitions/

const percent = pipe(num, n => `${Number(n).toFixed(1)}%`);
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
      formatter: rating,
    },
    {
      key: 'coverage',
      label: 'Coverage',
      formatter: percent,
    },
    {
      key: 'duplicatedLinesDensity',
      label: 'Duplicated lines density',
      formatter: percent,
    },
    {
      key: 'blockerViolations',
      label: 'Blocker violations',
      formatter: num,
    },
    {
      key: 'codeSmells',
      label: 'Code smells',
      formatter: num,
    },
    {
      key: 'criticalViolations',
      label: 'Critical violations',
      formatter: num,
    },
    // {
    //   key: 'new_technical_debt',
    //   label: 'Added Technical Debt',
    // },
    {
      key: 'newBranchCoverage',
      label: 'Condition coverage on new code',
      formatter: percent,
    },
    // {
    //   key: 'new_conditions_to_cover',
    //   label: 'Conditions to Cover on New Code',
    // },
    // {
    //   key: 'new_coverage',
    //   label: 'Coverage on New Code',
    // },
    // {
    //   key: 'new_development_cost',
    //   label: 'Development Cost on New Code',
    // },
    // {
    //   key: 'new_duplicated_blocks',
    //   label: 'Duplicated Blocks on New Code',
    // },
    {
      key: 'newDuplicatedLinesDensity',
      label: 'Duplicated lines (%) on new code',
      formatter: percent,
    },
    // {
    //   key: 'new_duplicated_lines',
    //   label: 'Duplicated Lines on New Code',
    // },
    // {
    //   key: 'new_line_coverage',
    //   label: 'Line Coverage on New Code',
    // },
    // {
    //   key: 'new_lines_to_cover',
    //   label: 'Lines to Cover on New Code',
    // },
    // {
    //   key: 'new_maintainability_rating',
    //   label: 'Maintainability Rating on New Code',
    // },
    {
      key: 'newBlockerViolations',
      label: 'New blocker issues',
      formatter: num,
    },
    {
      key: 'newBugs',
      label: 'New bugs',
      formatter: num,
    },
    // {
    //   key: 'new_code_smells',
    //   label: 'New Code Smells',
    // },
    {
      key: 'newCriticalViolations',
      label: 'New critical issues',
      formatter: num,
    },
    // {
    //   key: 'new_info_violations',
    //   label: 'New Info Issues',
    // },
    // {
    //   key: 'new_violations',
    //   label: 'New Issues',
    // },
    // {
    //   key: 'new_lines',
    //   label: 'New Lines',
    // },
    {
      key: 'newMajorViolations',
      label: 'New major issues',
      formatter: num,
    },
    {
      key: 'newMinorViolations',
      label: 'New minor issues',
      formatter: num,
    },
    // {
    //   key: 'new_security_hotspots',
    //   label: 'New Security Hotspots',
    // },
    // {
    //   key: 'new_vulnerabilities',
    //   label: 'New Vulnerabilities',
    // },
    // {
    //   key: 'new_reliability_rating',
    //   label: 'Reliability Rating on New Code',
    // },
    // {
    //   key: 'new_reliability_remediation_effort',
    //   label: 'Reliability Remediation Effort on New Code',
    // },
    // {
    //   key: 'new_security_hotspots_reviewed',
    //   label: 'Security Hotspots Reviewed on New Code',
    // },
    // {
    //   key: 'new_security_rating',
    //   label: 'Security Rating on New Code',
    // },
    // {
    //   key: 'new_security_remediation_effort',
    //   label: 'Security Remediation Effort on New Code',
    // },
    // {
    //   key: 'new_security_review_rating',
    //   label: 'Security Review Rating on New Code',
    // },
    // {
    //   key: 'new_security_hotspots_reviewed_status',
    //   label: 'Security Review Reviewed Status on New Code',
    // },
    // {
    //   key: 'new_security_hotspots_to_review_status',
    //   label: 'Security Review To Review Status on New Code',
    // },
    // {
    //   key: 'new_sqale_debt_ratio',
    //   label: 'Technical Debt Ratio on New Code',
    // },
    // {
    //   key: 'new_uncovered_conditions',
    //   label: 'Uncovered Conditions on New Code',
    // },
    // {
    //   key: 'new_uncovered_lines',
    //   label: 'Uncovered Lines on New Code',
    // },
  ],
  complexity: [
    {
      key: 'cognitive',
      label: 'Cognitive Complexity',
      formatter: num,
    },
    {
      key: 'cyclomatic',
      label: 'Cyclomatic Complexity',
      formatter: num,
    },
  ],
  reliability: [
    {
      key: 'bugs',
      label: 'Bugs',
      formatter: num,
    },
  ],
  security: [
    {
      key: 'vulnerabilities',
      label: 'Vulnerabilities',
      formatter: num,
    },
  ],
  duplications: [
    {
      key: 'blocks',
      label: 'Duplicated blocks',
      formatter: num,
    },
    {
      key: 'lines',
      label: 'Duplicated lines',
      formatter: num,
    },
    {
      key: 'files',
      label: 'Files with duplications',
      formatter: num,
    },
  ],
  maintainability: [
    {
      key: 'techDebt',
      label: 'Technical Debt',
      formatter: formatDebt,
    },
    {
      key: 'codeSmells',
      label: 'Code smells',
      formatter: num,
    },
  ],
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const reliabilityRatingMeaning = {
  A: 'No bugs',
  B: 'At least 1 minor bug',
  C: 'At least 1 major bug',
  D: 'At least 1 critical bug',
  E: 'At least 1 blocker bug',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const securityRatingMeaning = {
  A: 'No vulnerabilities',
  B: 'At least 1 minor vulnerability',
  C: 'At least 1 major vulnerability',
  D: 'At least 1 critical vulnerability',
  E: 'At least 1 blocker vulnerability',
};

const ratingType = (ratingValue: ReturnType<typeof rating>) => {
  switch (ratingValue) {
    case 'A': {
      return 'success';
    }
    case 'B':
    case 'C': {
      return 'warn';
    }
    case 'D':
    case 'E': {
      return 'danger';
    }
    default:
  }
};

type SubCardProps = {
  heading: string;
  rating?: string;
  className?: string;
  children?: React.ReactNode;
  ratingType?: ReturnType<typeof ratingType>;
};

const SubCard: React.FC<SubCardProps> = ({
  heading,
  rating,
  children,
  className,
  ratingType,
}) => {
  return (
    <div
      className={twJoin(
        'bg-theme-page-content rounded-lg shadow-sm py-4 px-5 border border-theme-seperator',
        ratingType === 'success' && 'border-l-4 border-l-theme-success',
        ratingType === 'warn' && 'border-l-4 border-l-theme-warn',
        ratingType === 'danger' && 'border-l-4 border-l-theme-danger',
        className
      )}
    >
      <div className="flex justify-between">
        <h2 className="text-sm font-semibold">{heading}</h2>
        {rating !== undefined && (
          <div
            className={twJoin(
              'font-semibold',
              ratingType === 'success' && 'text-theme-success',
              ratingType === 'warn' && 'text-theme-warn',
              ratingType === 'danger' && 'text-theme-danger'
            )}
          >
            {rating}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

const SingleAnalysis: React.FC<{
  codeQuality: NonNullable<UICodeQuality2>[number];
  isChild?: boolean;
}> = ({ codeQuality, isChild = false }) => (
  <div className="grid grid-cols-[2fr_1fr] gap-4">
    <div className={isChild ? 'p-4 border-r border-r-theme-seperator' : ''}>
      <div className="grid grid-cols-[1fr_min-content] items-end mb-3.5">
        <div>
          <h3 className="font-medium">SonarQube analysis</h3>
          <p className="text-theme-icon text-sm pt-1">
            {codeQuality.lastAnalysisDate
              ? `Last analysis was run on ${shortDate(
                  new Date(codeQuality.lastAnalysisDate)
                )}.`
              : 'Analysis has never been run'}
          </p>
        </div>
        <div>
          <a
            className="link-text whitespace-nowrap font-medium"
            href={codeQuality.url}
            target="_blank"
            rel="noreferrer"
          >
            See full details on SonarQube
          </a>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SubCard
          heading="Maintainability"
          rating={
            rating(codeQuality.maintainability.rating) === 'unknown'
              ? undefined
              : rating(codeQuality.maintainability.rating)
          }
          ratingType={ratingType(rating(codeQuality.maintainability.rating))}
        >
          <dl className="grid grid-cols-[1fr_min-content] gap-2 mt-6 mb-1">
            {fieldDefinitions.maintainability
              .filter(({ key }) => codeQuality.maintainability[key] !== undefined)
              .map(({ key, label, formatter }) => {
                const match = codeQuality.maintainability[key];
                if (match === undefined) return null;
                return (
                  <Fragment key={key}>
                    <dt>{label}</dt>
                    <dd className="font-medium text-right whitespace-nowrap">
                      {formatter(match)}
                    </dd>
                  </Fragment>
                );
              })}
          </dl>
        </SubCard>
        <SubCard
          heading="Reliability"
          rating={rating(codeQuality.reliability.rating)}
          ratingType={ratingType(rating(codeQuality.reliability.rating))}
        >
          <dl className="grid grid-cols-[1fr_min-content] gap-2 mt-6 mb-1">
            {fieldDefinitions.reliability
              .filter(({ key }) => codeQuality.reliability[key] !== undefined)
              .map(({ key, label, formatter }) => {
                const match = codeQuality.reliability[key];
                if (match === undefined) return null;
                return (
                  <Fragment key={key}>
                    <dt>{label}</dt>
                    <dd className="font-medium text-right whitespace-nowrap">
                      {formatter(match)}
                    </dd>
                  </Fragment>
                );
              })}
          </dl>
        </SubCard>
        <SubCard
          heading="Security"
          rating={rating(codeQuality.security.rating)}
          ratingType={ratingType(rating(codeQuality.security.rating))}
        >
          <dl className="grid grid-cols-[1fr_min-content] gap-2 mt-6 mb-1">
            {fieldDefinitions.security
              .filter(({ key }) => codeQuality.security[key] !== undefined)
              .map(({ key, label, formatter }) => {
                const match = codeQuality.security[key];
                if (match === undefined) return null;
                return (
                  <Fragment key={key}>
                    <dt>{label}</dt>
                    <dd className="font-medium text-right whitespace-nowrap">
                      {formatter(match)}
                    </dd>
                  </Fragment>
                );
              })}
          </dl>
        </SubCard>
        <SubCard
          heading="Coverage"
          rating={
            codeQuality.coverage.byTests === undefined
              ? undefined
              : percent(codeQuality.coverage.byTests)
          }
        >
          {codeQuality.coverage.line === undefined &&
          codeQuality.coverage.branch === undefined ? (
            <div className="text-theme-helptext text-sm px-1">
              No coverage data available
            </div>
          ) : (
            <>
              <table className="w-full mt-6 mb-1">
                <tbody>
                  {(
                    [
                      {
                        label: 'Line coverage',
                        stat: 'line',
                        uncovered: 'uncoveredLines',
                        toCover: 'linesToCover',
                      },
                      {
                        label: 'Branch coverage',
                        stat: 'branch',
                        uncovered: 'uncoveredConditions',
                        toCover: 'conditionsToCover',
                      },
                    ] as const
                  )
                    .filter(({ stat }) => codeQuality.coverage[stat] !== undefined)
                    .map(({ label, stat, uncovered, toCover }) => {
                      if (codeQuality.coverage[stat] === undefined) return null;
                      return (
                        <React.Fragment key={stat}>
                          <tr>
                            <td
                              className={
                                codeQuality.coverage[uncovered] === undefined
                                  ? 'pb-1'
                                  : ''
                              }
                            >
                              {label}
                            </td>
                            {}
                            <td className="text-right p-1 font-semibold">
                              {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                              {percent(codeQuality.coverage[stat]!)}
                            </td>
                          </tr>
                          {codeQuality.coverage[uncovered] !== undefined && (
                            <tr>
                              <td
                                colSpan={2}
                                className="pb-1 text-xs text-theme-helptext"
                              >
                                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                                {`${num(codeQuality.coverage[uncovered]!)} ${
                                  codeQuality.coverage[toCover] === undefined
                                    ? ''
                                    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                      ` of ${num(codeQuality.coverage[toCover]!)}`
                                } to be covered`}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
              <p className="text-xs text-theme-helptext mt-6">
                Note, SonarQube computes its own values for coverage.{' '}
                <a
                  href="https://community.sonarsource.com/t/sonarqube-and-code-coverage/4725/1"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-text"
                >
                  Details
                </a>
                .
              </p>
            </>
          )}
        </SubCard>
        <SubCard
          heading="Duplications"
          rating={
            codeQuality.duplication.linesDensity === undefined
              ? undefined
              : percent(codeQuality.duplication.linesDensity)
          }
        >
          <dl className="grid grid-cols-[1fr_min-content] gap-2 mt-6 mb-1">
            {fieldDefinitions.duplications
              .filter(({ key }) => codeQuality.duplication[key] !== undefined)
              .map(({ key, label, formatter }) => {
                const match = codeQuality.duplication[key];
                if (match === undefined) return null;
                return (
                  <Fragment key={key}>
                    <dt>{label}</dt>
                    <dd className="font-medium text-right whitespace-nowrap">
                      {formatter(match)}
                    </dd>
                  </Fragment>
                );
              })}
          </dl>
        </SubCard>
        <SubCard heading="Complexity">
          {fieldDefinitions.complexity.filter(
            ({ key }) => codeQuality.complexity[key] !== undefined
          ).length === 0 ? (
            <div className="text-theme-helptext text-sm px-1">
              No complexity data available
            </div>
          ) : (
            <dl className="grid grid-cols-[1fr_min-content] gap-2 mt-6 mb-1">
              {fieldDefinitions.complexity.map(({ key, label, formatter }) => {
                const match = codeQuality.complexity[key];
                if (match === undefined) return null;
                return (
                  <Fragment key={key}>
                    <dt className="p-1">{label}</dt>
                    <dd className="font-medium text-right whitespace-nowrap">
                      {formatter(match)}
                    </dd>
                  </Fragment>
                );
              })}
            </dl>
          )}
        </SubCard>
      </div>
    </div>
    <div
      className={twJoin(
        'bg-theme-page-content rounded-lg shadow-sm py-4',
        isChild ? 'pr-5' : 'px-5 border border-theme-seperator'
      )}
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-semibold">Quality gates</h2>
          <div className="pt-2 text-xs text-gray-600">
            {'Using '}
            <strong className="font-medium">
              {codeQuality.qualityGateName === null
                ? 'Unknown'
                : codeQuality.qualityGateName}
            </strong>
          </div>
        </div>
        <div
          className={twJoin(
            'px-2 rounded',
            codeQuality.quality.gate === 'pass'
              ? 'text-theme-success bg-theme-success'
              : 'text-theme-danger bg-theme-danger-dim'
          )}
        >
          {capitalizeFirstLetter(codeQuality.quality.gate)}
        </div>
      </div>
      <table className="w-full mt-6">
        <tbody>
          {fieldDefinitions.qualityGate
            .filter(({ key }) => codeQuality.quality[key] !== undefined)
            .map(({ key, label, formatter }) => {
              const match = codeQuality.quality[key];
              if (!match) return null;

              return (
                <tr key={key}>
                  <td className="align-top text-center w-8">
                    <div
                      className={twJoin(
                        `py-1 text-xs rounded-md text-center`,
                        match.status === 'pass'
                          ? 'text-theme-success'
                          : 'text-theme-danger'
                      )}
                    >
                      {match.status === 'pass' ? (
                        <CheckCircle size={20} />
                      ) : (
                        <XCircle size={20} />
                      )}
                    </div>
                  </td>
                  <td className="align-top pb-5">
                    <div className="text-sm font-medium pb-1">{label}</div>
                    {match.op && (match.level || match.level === 0) && (
                      <div className="text-theme-helptext text-xs">
                        {key === 'securityRating'
                          ? `Should be ${
                              match.op === 'gt' ? 'better than' : 'lower than'
                            } ${formatter(match.level)}`
                          : `Should be ${
                              match.op === 'gt'
                                ? match.level === 0
                                  ? ''
                                  : 'less than'
                                : 'higher than'
                            } ${formatter(match.level)}`}
                      </div>
                    )}
                  </td>
                  <td className="font-semibold align-top text-right">
                    {formatter(match.value || 0)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </div>
);

const AnalysisTable: React.FC<{ codeQuality: NonNullable<UICodeQuality2> }> = ({
  codeQuality,
}) => {
  const [expandedRows, setExpandedRows] = useState<NonNullable<UICodeQuality2>>([]);
  const [collapsingRows, setCollapsingRows] = useState<NonNullable<UICodeQuality2>>([]);

  return (
    <ul className="">
      {codeQuality.map(codeQualityItem => (
        <li
          key={codeQualityItem.name}
          className="rounded-lg border border-theme-seperator bg-theme-page-content mb-4 overflow-hidden"
        >
          <button
            className="grid grid-cols-[min-content_1fr_5rem] gap-4 w-full text-left cursor-pointer p-4 hover:bg-theme-hover"
            onClick={() => {
              if (expandedRows.includes(codeQualityItem)) {
                // setExpandedRows(expandedRows.filter(item => item !== codeQualityItem));
                setCollapsingRows(rows => [...rows, codeQualityItem]);
              } else {
                setExpandedRows([...expandedRows, codeQualityItem]);
              }
            }}
          >
            <div
              className={twJoin(
                'pt-1 text-theme-icon transition-all duration-200',
                expandedRows.includes(codeQualityItem)
                  ? 'rotate-90 text-theme-icon-active'
                  : ''
              )}
            >
              <ChevronRight size={18} />
            </div>
            <div className="">
              <h3 className="font-medium mb-1">{codeQualityItem.name}</h3>
              <ul>
                {(
                  [
                    {
                      title: 'Maintainability',
                      rating: rating(codeQualityItem.maintainability.rating),
                    },
                    {
                      title: 'Reliability',
                      rating: rating(codeQualityItem.reliability.rating),
                    },
                    {
                      title: 'Security',
                      rating: rating(codeQualityItem.security.rating),
                    },
                  ] as const
                ).map(({ title, rating }) => (
                  <li key={title} className="inline-block">
                    <span className="inline-block">{title}</span>
                    <span
                      className={twJoin(
                        'inline-block ml-2 mr-6 px-2 rounded text-sm',
                        ratingType(rating) === 'success'
                          ? 'text-theme-success bg-theme-success'
                          : 'text-theme-danger bg-theme-danger-dim'
                      )}
                    >
                      {rating}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={twJoin(
                'self-center text-xl font-medium grid grid-flow-col items-center',
                codeQualityItem.quality.gate === 'pass'
                  ? 'text-theme-success'
                  : 'text-theme-danger'
              )}
            >
              {codeQualityItem.quality.gate === 'pass' ? (
                <CheckCircle className="inline-block" />
              ) : (
                <XCircle className="inline-block" />
              )}
              <span>{capitalizeFirstLetter(codeQualityItem.quality.gate)}</span>
            </div>
          </button>
          {expandedRows.includes(codeQualityItem) && (
            <AnimateHeight
              collapse={collapsingRows.includes(codeQualityItem)}
              onCollapsed={() => {
                setExpandedRows(rows => rows.filter(x => x !== codeQualityItem));
                setCollapsingRows(rows => rows.filter(x => x !== codeQualityItem));
              }}
            >
              <div className="border-t border-theme-seperator">
                <SingleAnalysis codeQuality={codeQualityItem} isChild />
              </div>
            </AnimateHeight>
          )}
        </li>
      ))}
    </ul>
  );
};
export default (
  repositoryId: string,
  defaultBranch: string | undefined,
  sonarQualityGate: string | null
): Tab => ({
  title: 'Code quality',
  count: sonarQualityGate || 'unknown',
  Component: () => {
    const { collectionName, project } = useCollectionAndProject();
    const sonarMeasures = trpc.sonar.getRepoSonarMeasures.useQuery({
      collectionName,
      project,
      repositoryId,
      defaultBranch,
    });

    if (!sonarMeasures.data) {
      return (
        <TabContents gridCols={1}>
          <Loading />
        </TabContents>
      );
    }

    if (sonarMeasures.data.length > 0) {
      return (
        <TabContents gridCols={1}>
          {sonarMeasures.data.length === 1 ? (
            <SingleAnalysis codeQuality={sonarMeasures.data[0]} />
          ) : (
            <AnalysisTable codeQuality={sonarMeasures.data} />
          )}
        </TabContents>
      );
    }

    return (
      <TabContents gridCols={0}>
        <AlertMessage message="Couldn't find this repo on SonarQube" />
      </TabContents>
    );
  },
});
