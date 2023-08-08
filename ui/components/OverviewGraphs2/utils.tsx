import { useMemo } from 'react';
import { propEq } from 'rambda';
import { createPalette, minPluralise, num, prettyMS } from '../../helpers/utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { divide, exists } from '../../../shared/utils.js';
import type {
  CountResponse,
  DateDiffResponse,
} from '../../../backend/models/workitems2.js';
import { noGroup } from '../../../shared/work-item-utils.js';

export const prettyStates = (startStates: string[]) => {
  if (startStates.length === 1) return `the '${startStates[0]}' state`;
  return `the ${new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(
    startStates.map(x => `'${x}'`)
  )} states`;
};

export const lineColor = createPalette([
  '#9A6324',
  '#e6194B',
  '#3cb44b',
  '#ffe119',
  '#000075',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#bfef45',
  '#fabed4',
  '#a9a9a9',
]);

export const useMergeWithConfig = <T extends CountResponse | DateDiffResponse>(
  data: { workItemType: string; data: T[] }[] | undefined
) => {
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery({ queryContext });

  return useMemo(() => {
    return data
      ?.map(wit => {
        const matchingConfig = pageConfig.data?.workItemsConfig?.find(
          w => w.name[0] === wit.workItemType
        );
        if (!matchingConfig) return null;
        return { config: matchingConfig, data: wit.data };
      })
      .filter(exists);
  }, [data, pageConfig.data?.workItemsConfig]);
};

export type WorkItemConfig = NonNullable<
  RouterClient['workItems']['getPageConfig']['workItemsConfig']
>[number];

export const groupHoverTooltipForCounts = (
  workItemConfig: WorkItemConfig,
  data: CountResponse[]
) => {
  return (index: number) => {
    const groups = data.reduce<{ groupName: string; count: number }[]>((acc, line) => {
      const match = line.countsByWeek.find(propEq('weekIndex', index));
      if (!match) return acc;
      acc.push({ groupName: line.groupName, count: match.count });
      return acc;
    }, []);

    if (!groups.length) return null;

    return (
      <div className="bg-theme-backdrop bg-opacity-90 rounded-md text-theme-base-inverted py-2 px-4">
        <div className="flex gap-2 items-center mb-1">
          <img
            src={workItemConfig.icon}
            alt={`Iconn for ${workItemConfig.name[1]}`}
            className="w-3"
          />
          <span className="font-semibold">{workItemConfig.name[1]}</span>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? minPluralise(item.count, ...workItemConfig.name)
                : item.groupName}
              <span className="inline-block ml-2">{num(item.count || 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
};

export const groupHoverTooltipForDateDiff = (
  workItemConfig: WorkItemConfig,
  data: DateDiffResponse[]
) => {
  return (index: number) => {
    const groups = data.reduce<
      { groupName: string; totalDuration: number; count: number }[]
    >((acc, line) => {
      const match = line.countsByWeek.find(w => w.weekIndex === index);
      if (!match) return acc;
      acc.push({
        groupName: line.groupName,
        totalDuration: match.totalDuration,
        count: match.count,
      });
      return acc;
    }, []);

    if (!groups.length) return null;

    return (
      <div className="bg-black rounded-md text-theme-base-inverted py-2 px-4">
        <div className="flex gap-2 items-center mb-1">
          <img
            src={workItemConfig.icon}
            alt={`Iconn for ${workItemConfig.name[1]}`}
            className="w-3"
          />
          <span className="font-semibold">{workItemConfig.name[1]}</span>
        </div>
        <ul className="text-sm grid grid-cols-[fit-content_1fr] gap-y-0.5">
          {groups.map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup
                ? minPluralise(item.count, ...workItemConfig.name)
                : item.groupName}{' '}
              {item.count}
              <span className="inline-block ml-2">
                {divide(item.totalDuration, item.count).map(prettyMS).getOr('-')}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
};
