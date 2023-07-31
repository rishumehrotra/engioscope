import React, { useCallback, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { GitBranch, XCircle } from 'react-feather';
import { twMerge } from 'tailwind-merge';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject } from '../hooks/query-hooks.js';
import { TickCircle } from './common/Icons.jsx';

export const policyNames = {
  'Minimum number of reviewers': 'Minimum number of reviewers',
  'Build': 'Runs builds',
  'Work item linking': 'Requires links to work items',
  'Comment requirements': 'Requires comment resolution',
} as const;

export const policyClasses = {
  pass: 'text-theme-success',
  warn: 'text-theme-warn',
  fail: 'text-theme-danger',
} as const;

export type PolicyNames = keyof typeof policyNames;

const BranchPolicyPill: React.FC<{
  repositoryId: string;
  refName: string;
  conforms: boolean | undefined;
  className?: string;
}> = ({ conforms, repositoryId, refName, className }) => {
  const { collectionName, project } = useCollectionAndProject();
  const domId = `bdi-${repositoryId}-${refName}`;
  const [hasHovered, setHasHovered] = useState(false);
  const branchPolicies = trpc.repos.getBranchPolicies.useQuery(
    { collectionName, project, repositoryId, refName },
    { enabled: hasHovered }
  );

  const isOptional = useCallback(
    (policyName: PolicyNames) => {
      if (branchPolicies.status === 'loading') {
        return false;
      }
      return !(branchPolicies.data?.[policyName]?.isBlocking ?? true);
    },
    [branchPolicies.data, branchPolicies.status]
  );

  const policyStatus = useCallback(
    (policyName: PolicyNames) => {
      if (branchPolicies.status === 'loading') return;

      const policy = branchPolicies.data?.[policyName];
      if (!policy) return 'fail';

      if (!policy.isEnabled) return 'fail';

      if (policy.isEnabled && !policy.isBlocking) return 'warn';

      if (policyName === 'Minimum number of reviewers') {
        return (policy.minimumApproverCount || 0) > 1 ? 'pass' : 'warn';
      }

      return 'pass';
    },
    [branchPolicies.data, branchPolicies.status]
  );

  const policyClassName = useCallback(
    (policyName: PolicyNames) => {
      switch (policyStatus(policyName)) {
        case 'pass': {
          return 'text-theme-success';
        }
        case 'fail': {
          return 'text-theme-danger';
        }
        case 'warn': {
          return 'text-theme-warn';
        }
        default:
      }
    },
    [policyStatus]
  );

  return (
    <>
      <span
        className={twMerge(
          'text-sm rounded px-2 py-0.5 inline-flex items-center gap-1',
          conforms ? 'bg-theme-success-dim' : 'bg-theme-tag',
          className
        )}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tooltip-id={domId}
      >
        <GitBranch
          size={16}
          className={conforms ? 'text-theme-helptext' : 'text-theme-danger'}
        />
        {refName.replace('refs/heads/', '')}
      </span>
      <Tooltip
        id={domId}
        place="bottom"
        className="w-72 text-left whitespace-normal"
        style={{ borderRadius: '0.375rem' }}
      >
        <div className="leading-snug text-sm mb-1">
          <strong>Branch policies</strong>

          <ul className="mt-2">
            {Object.entries(policyNames).map(([p, displayName]) => {
              const policyName = p as PolicyNames;

              return (
                <li
                  key={policyName}
                  className="w-72 grid grid-cols-[min-content_1fr] gap-2 mb-2 items-start"
                >
                  <div className={policyClassName(policyName)}>
                    {((policy: ReturnType<typeof policyStatus>) => {
                      if (policy === 'pass' || policy === 'warn') {
                        return <TickCircle size={18} />;
                      }
                      if (policy === 'fail') return <XCircle size={18} />;
                      return null;
                    })(policyStatus(policyName))}
                  </div>
                  <div>
                    {displayName}
                    {policyStatus(policyName) === 'warn' ? (
                      <div className="text-theme-icon">Enabled, but not blocking</div>
                    ) : null}
                    {isOptional(policyName) ? ' (optional)' : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Tooltip>
    </>
  );
};

export default BranchPolicyPill;
