import React from 'react';
import type { ReactNode } from 'react';
import type { ProjectOverviewAnalysis } from '../../../shared/types';
import { contrastColour, shortDate } from '../../helpers/utils';
import { lineColor } from './helpers';
import type { GroupLabel } from './helpers';
import type { WorkItemLine } from './day-wise-line-graph-helpers';
import { getMatchingAtIndex } from './day-wise-line-graph-helpers';

type CrosshairBubbleProps = {
  data: WorkItemLine[];
  index: number;
  projectAnalysis: ProjectOverviewAnalysis;
  groupLabel: (x: GroupLabel) => string;
  title: ReactNode;
  itemStat: (x: number[]) => ReactNode;
};
export const CrosshairBubble: React.FC<CrosshairBubbleProps> = ({
  data, index, projectAnalysis, groupLabel, title, itemStat
}) => {
  const matching = getMatchingAtIndex(data, index);

  return matching.length
    ? (
      <div className="bg-black bg-opacity-80 text-white text-sm py-3 px-4 rounded-md shadow">
        <h2
          className="font-semibold text-base mb-2 grid grid-cols-2 items-end"
          style={{
            gridTemplateColumns: '2fr 1fr'
          }}
        >
          <div className="text-xl">
            {title}
          </div>
          <div className="justify-self-end">
            {shortDate(matching[0].date)}
          </div>
        </h2>
        {matching
          .map(({ witId, groupName, workItemIds }) => (
            <div key={witId + groupName}>
              <div className="flex items-center pb-1">
                <img
                  className="inline-block mr-1"
                  alt={`Icon for ${projectAnalysis.overview.types[witId].name[0]}`}
                  src={projectAnalysis.overview.types[witId].icon}
                  width="16"
                />
                {groupLabel({ witId, groupName })}
                <span
                  className="rounded-full bg-white bg-opacity-20 text-xs font-semibold px-2 text-white ml-2 inline-block"
                  style={{
                    backgroundColor: lineColor({ witId, groupName }),
                    color: contrastColour(lineColor({ witId, groupName }))
                  }}
                >
                  {itemStat(workItemIds)}
                </span>
              </div>
            </div>
          ))}
      </div>
    )
    : null;
};
