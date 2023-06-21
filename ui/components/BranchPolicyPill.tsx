import React, { useCallback, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { trpc } from '../helpers/trpc.js';
import { useCollectionAndProject } from '../hooks/query-hooks.js';

export const policyNames = {
  'Minimum number of reviewers': 'Minimum number of reviewers',
  'Build': 'Runs builds',
  'Work item linking': 'Requires links to work items',
  'Comment requirements': 'Requires comment resolution',
} as const;

export const policyClasses = {
  pass: 'bg-green-500',
  warn: 'bg-yellow-500',
  fail: 'bg-red-500',
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

  const policyClassName = useCallback(
    (policyName: PolicyNames) => {
      if (branchPolicies.status === 'loading') {
        return '';
      }
      const policy = branchPolicies.data?.[policyName];
      if (!policy) {
        return policyClasses.fail;
      }

      if (!policy.isEnabled) {
        return policyClasses.fail;
      }
      if (policy.isEnabled && !policy.isBlocking) {
        return policyClasses.warn;
      }

      if (policyName === 'Minimum number of reviewers') {
        return (policy.minimumApproverCount || 0) > 1
          ? policyClasses.pass
          : policyClasses.warn;
      }

      return policyClasses.pass;
    },
    [branchPolicies.data, branchPolicies.status]
  );

  return (
    <>
      <span
        className={`text-xs border-2 rounded-full px-2 inline-block ${className || ''} ${
          conforms ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
        }`}
        onMouseOver={() => setHasHovered(true)}
        onFocus={() => setHasHovered(true)}
        data-tooltip-id={domId}
      >
        Policies
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
                <li key={policyName} className="w-72">
                  <span
                    className={`rounded inline-block w-2 h-2 mr-2 ${policyClassName(
                      policyName
                    )}`}
                  />
                  {displayName}
                  {isOptional(policyName) ? ' (optional)' : null}
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
