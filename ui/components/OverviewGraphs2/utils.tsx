import { useMemo } from 'react';
import { createPalette, num, prettyMS } from '../../helpers/utils.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import { exists } from '../../../shared/utils.js';
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

export const groupHoverTooltipForCounts = (data: CountResponse[]) => {
  return (index: number) => {
    return (
      <ul className="text-sm grid grid-cols-[fit-content_1fr]">
        {data
          .reduce<{ groupName: string; count: number }[]>((acc, line) => {
            const match = line.countsByWeek.find(w => w.weekIndex === index);
            if (!match) return acc;
            acc.push({ groupName: line.groupName, count: match.count });
            return acc;
          }, [])
          .map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup ? '' : item.groupName}
              <span className="inline-block ml-2">{num(item.count || 0)}</span>
            </li>
          ))}
      </ul>
    );
  };
};

export const groupHoverTooltipForDateDiff = (data: DateDiffResponse[]) => {
  return (index: number) => {
    return (
      <ul className="text-sm grid grid-cols-[fit-content_1fr]">
        {data
          .reduce<{ groupName: string; count: number }[]>((acc, line) => {
            const match = line.countsByWeek.find(w => w.weekIndex === index);
            if (!match) return acc;
            acc.push({
              groupName: line.groupName,
              count: match.totalDuration / match.count,
            });
            return acc;
          }, [])
          .map(item => (
            <li key={item.groupName} className="flex items-center">
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ background: lineColor(item.groupName) }}
              />{' '}
              {item.groupName === noGroup ? '' : item.groupName}
              <span className="inline-block ml-2">{prettyMS(item.count || 0)}</span>
            </li>
          ))}
      </ul>
    );
  };
};
