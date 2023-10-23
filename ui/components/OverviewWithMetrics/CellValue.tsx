import type { ReactNode } from 'react';
import React from 'react';
import { identity, prop, range, sum } from 'rambda';
import { ExternalLink } from '../common/Icons.jsx';
import TinyAreaGraph, {
  graphConfig,
  increaseIsBetter,
} from '../graphs/TinyAreaGraph.jsx';
import type {
  CountResponse,
  DateDiffResponse,
  FlowEfficiencyWorkItems,
} from '../../../backend/models/workitems2.js';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { num } from '../../helpers/utils.js';

const NewDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.NewDrawer,
  }))
);

type Value<T extends CountResponse | DateDiffResponse | FlowEfficiencyWorkItems> =
  | {
      data: T[];
      workItemType: string;
    }[]
  | undefined;

type ValueHelpers<T extends CountResponse | DateDiffResponse | FlowEfficiencyWorkItems> =
  (
    config: SingleWorkItemConfig,
    value: Value<T>,
    setDrawerProps: DrawerPropsSetter,
    openDrawer: () => void
  ) => {
    value: string;
    color: ReturnType<typeof increaseIsBetter>;
    graphData: number[];
    onClick: () => void;
  };

type DrawerPropsSetter = (
  value: React.SetStateAction<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string | undefined;
  }>
) => void;

export const valueTypes = {
  new: (
    config: SingleWorkItemConfig,
    value: Value<CountResponse>,
    setDrawerProps: DrawerPropsSetter,
    openDrawer: () => void
  ) => {
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
  },
  // wip: {},
  // velocity: {},
  // cycleTime: {},
  // clt: {},
  // flowEfficiency: {},
};

type CellValueProps<
  T extends CountResponse | DateDiffResponse | FlowEfficiencyWorkItems,
> = {
  value: Value<T>;
  // onClick: () => void;
  workItemConfig: SingleWorkItemConfig;
  valueType: ValueHelpers<T>;
  setDrawerProps: DrawerPropsSetter;
  openDrawer: () => void;
};

const CellValue = <T extends CountResponse | DateDiffResponse | FlowEfficiencyWorkItems>({
  value,
  // onClick,
  workItemConfig,
  valueType,
  setDrawerProps,
  openDrawer,
}: CellValueProps<T>) => {
  const {
    value: valueToDisplay,
    color,
    graphData,
    onClick,
  } = valueType(workItemConfig, value, setDrawerProps, openDrawer);

  return (
    <div className="flex flex-row items-center group">
      {valueToDisplay}
      <button type="button" title="drawer-button" onClick={onClick}>
        <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
      </button>
      {graphData ? (
        <div className="w-12">
          <TinyAreaGraph
            data={graphData}
            itemToValue={identity}
            color={color}
            graphConfig={{ ...graphConfig.small, width: 50 }}
            className="mb-3 inline-block"
          />
        </div>
      ) : null}
    </div>
  );
};

export default CellValue;
