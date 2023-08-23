import React from 'react';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';

const PopupBubbleGraph = React.lazy(() => import('./PopupBubbleGraph.jsx'));

export default {
  'time-spent-completed': (
    config: SingleWorkItemConfig,
    lineColor: (x: string) => string
  ) => ({
    label: 'View time spent',
    heading: `Time spent - closed ${config.name[1].toLowerCase()}`,
    subheading: `See where closed ${config.name[1].toLowerCase()} spent their time`,
    children: (
      <PopupBubbleGraph type="closed" workItemConfig={config} lineColor={lineColor} />
    ),
  }),
  'time-spent-wip': (config: SingleWorkItemConfig, lineColor: (x: string) => string) => ({
    label: 'View time spent',
    heading: `Time spent - WIP ${config.name[1].toLowerCase()}`,
    subheading: `See where WIP ${config.name[1].toLowerCase()} spent their time`,
    children: (
      <PopupBubbleGraph type="wip" workItemConfig={config} lineColor={lineColor} />
    ),
  }),
} as const;
