import { prop, range, sum } from 'rambda';
import React from 'react';
import type { CountResponse } from '../../../../backend/models/workitems2.js';
import type { CellHelper, DataSeries } from './types.js';
import { num } from '../../../helpers/utils.js';
import { increaseIsBetter } from '../../graphs/TinyAreaGraph.jsx';

const NewDrawer = React.lazy(() =>
  import('../../OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.NewDrawer,
  }))
);

export default (value: DataSeries<CountResponse>): CellHelper =>
  (config, setDrawerProps, openDrawer) => {
    const countsByWeek = value
      ?.find(x => x.workItemType === config.name[0])
      ?.data.flatMap(x => x.countsByWeek);

    const graphData = range(0, 12).map(weekIndex => {
      return sum(
        countsByWeek?.filter(x => x.weekIndex === weekIndex).map(prop('count')) || []
      );
    });

    return {
      value: num(sum(countsByWeek?.map(prop('count')) || [])),
      color: increaseIsBetter(graphData),
      graphData,
      onClick: () => {
        setDrawerProps({
          heading: `${config.name[1]}`,
          children: <NewDrawer selectedTab="all" workItemConfig={config} />,
        });
        openDrawer();
      },
    };
  };
