import React, { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { CheckCircle, XCircle } from 'react-feather';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import { num } from '../../helpers/utils.js';

type CentralTemplateUsageProps = {
  centralTemplateRuns: number;
  mainBranchCentralTemplateBuilds: number;
  totalRuns: number;
  buildDefinitionId: string;
};

const CentralTemplateUsageUI: React.FC<CentralTemplateUsageProps> = ({
  centralTemplateRuns,
  mainBranchCentralTemplateBuilds,
  totalRuns,
  buildDefinitionId,
}) => {
  const cnp = useCollectionAndProject();
  const domId = `bdi-${buildDefinitionId}`;
  const [hasHovered, setHasHovered] = useState(false);
  const centralTemplateOptions = trpc.builds.centralTemplateOptions.useQuery(
    { ...cnp, buildDefinitionId },
    { enabled: hasHovered }
  );

  if (centralTemplateRuns === 0) {
    return (
      <span
        className="text-sm px-1.5 py-0.5 bg-theme-danger-dim rounded-sm text-theme-danger"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="None of the builds used the central build template"
        data-tooltip-place="bottom"
      >
        No
      </span>
    );
  }
  return (
    <>
      <span
        className={`text-sm px-1.5 py-0.5 rounded-sm font-semibold ${
          centralTemplateRuns >= totalRuns
            ? 'text-theme-success bg-theme-success'
            : 'text-theme-warn bg-theme-warn'
        }`}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tooltip-id={domId}
      >
        Yes
      </span>
      <Tooltip
        id={domId}
        place="bottom"
        style={{ borderRadius: '0.375rem', zIndex: 10 }}
        opacity={1}
      >
        <div className="w-72 pt-2 text-left whitespace-normal">
          <div className="bg-theme-page-content rounded-3xl mb-2">
            <div
              className="bg-theme-highlight rounded-3xl h-2"
              style={{
                width: divide(centralTemplateRuns, totalRuns)
                  .map(toPercentage)
                  .getOr('0%'),
              }}
            />
          </div>
          <div className="mb-2 leading-snug">
            {centralTemplateRuns >= totalRuns ? (
              <strong>All</strong>
            ) : (
              <>
                <strong>{num(Math.min(centralTemplateRuns, totalRuns))}</strong>
                {' out of the '}
                <strong>{num(totalRuns)}</strong>
              </>
            )}
            {` build ${
              totalRuns === 1 ? 'run' : 'runs'
            } used the central build template.`}
          </div>
          <div className="mb-2">
            {mainBranchCentralTemplateBuilds >= centralTemplateRuns ? (
              <strong>All</strong>
            ) : (
              <strong>
                {num(Math.min(mainBranchCentralTemplateBuilds, centralTemplateRuns))}
              </strong>
            )}
            {` ${centralTemplateRuns === 1 ? 'run' : 'runs'} on the main branch.`}
          </div>
          {centralTemplateOptions.data ? (
            <>
              <strong>Template options:</strong>
              <ul>
                {Object.entries(centralTemplateOptions.data).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-1">
                    <span>{`${key}: `}</span>
                    {typeof value === 'boolean' ? (
                      <span
                        className={`${
                          value ? 'text-theme-success' : 'text-theme-danger'
                        } inline-block`}
                      >
                        {value ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </span>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Tooltip>
    </>
  );
};

export default CentralTemplateUsageUI;
