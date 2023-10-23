import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { identity, range } from 'rambda';
import { ExternalLink } from 'react-feather';
import { isDefined, num, prettyMS } from '../../helpers/utils.js';
import { divide, toPercentage } from '../../../shared/utils.js';
import TinyAreaGraph, { areaGraphColors, graphConfig } from '../graphs/TinyAreaGraph.jsx';
import { isBugLike } from '../../../shared/work-item-utils.js';
import { useDrawer } from '../common/Drawer.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import type { ProjectOverviewStats } from '../../../backend/models/project-overview.js';
import RowLabel from './RowLabel.jsx';
import CellValue, { valueTypes } from './CellValue.jsx';

type QualityMetricsProps = {
  stats: Partial<ProjectOverviewStats>;
  pageConfig: RouterClient['workItems']['getPageConfig'] | undefined;
};

const style = { boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.05)' };
const CycleTimeDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.CycleTimeDrawer,
  }))
);
const WIPTrendDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.WIPTrendDrawer,
  }))
);
const ChangeLeadTimeDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.ChangeLeadTimeDrawer,
  }))
);

const FlowMetrics: React.FC<QualityMetricsProps> = ({ stats, pageConfig }) => {
  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [additionalDrawerProps, setAdditionalDrawerProps] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({
    heading: 'Loading...',
    children: 'Loading...',
  });

  return (
    <div>
      <Drawer {...drawerProps} {...additionalDrawerProps} />
      <div className="mt-6">
        <h2 className="mb-2 uppercase text-sm tracking-wide">Flow metrics</h2>
        <div className="grid grid-cols-4 gap-4">
          <div
            className="col-span-1 bg-white rounded-lg shadow border border-gray-200 p-3"
            style={style}
          >
            <h4 className="text-gray-950 text-base font-medium mb-4">Incoming</h4>
            <table className="overview-table w-full">
              <thead className="text-base font-normal">
                <tr>
                  <td />
                  <td>
                    New
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                </tr>
              </thead>
              <tbody>
                {isDefined(stats.newWorkItems)
                  ? pageConfig?.workItemsConfig
                      ?.filter(w => !isBugLike(w.name[0]))
                      .map(config => {
                        return (
                          <tr key={config?.name[0]}>
                            <td>
                              <RowLabel config={config} label={config.name[0]} />
                            </td>
                            <td>
                              <CellValue
                                value={stats.newWorkItems}
                                valueType={valueTypes.new}
                                workItemConfig={config}
                                setDrawerProps={setAdditionalDrawerProps}
                                openDrawer={openDrawer}
                              />
                            </td>
                          </tr>
                        );
                      })
                  : null}
              </tbody>
            </table>
          </div>
          <div
            className="bg-white rounded-lg shadow border border-gray-200 p-3"
            style={style}
          >
            <h4 className="text-gray-950 text-base font-medium mb-4">Work in progress</h4>
            <table className="overview-table w-full">
              <thead className="text-base font-normal">
                <tr>
                  <td />
                  <td>
                    WIP Trend
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                </tr>
              </thead>
              <tbody>
                {pageConfig?.workItemsConfig
                  ?.filter(w => !isBugLike(w.name[0]))
                  .map(config => {
                    return (
                      <tr key={config?.name[0]}>
                        <td>
                          <RowLabel config={config} label={config.name[0]} />
                        </td>
                        <td>
                          <div className="flex flex-row items-center group">
                            {isDefined(stats.wipTrendWorkItems)
                              ? num(
                                  stats.wipTrendWorkItems
                                    ?.find(x => x.workItemType === config?.name[0])
                                    ?.data.map(x => x.countsByWeek.at(-1)?.count || 0)
                                    .reduce((acc, curr) => acc + curr) || 0
                                )
                              : null}
                            <button
                              type="button"
                              title="drawer-button"
                              onClick={() => {
                                setAdditionalDrawerProps({
                                  heading: `${config.name[1]}`,
                                  children: (
                                    <WIPTrendDrawer
                                      selectedTab="all"
                                      workItemConfig={config}
                                    />
                                  ),
                                });
                                openDrawer();
                              }}
                            >
                              <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
                            </button>
                            <div className="w-12">
                              <TinyAreaGraph
                                data={range(0, 12).map(weekIndex => {
                                  return (
                                    stats.wipTrendWorkItems
                                      ?.find(x => x.workItemType === config?.name[0])
                                      ?.data.flatMap(x => x.countsByWeek)
                                      .filter(x => x.weekIndex === weekIndex)
                                      .reduce((acc, curr) => acc + curr.count, 0) || 0
                                  );
                                })}
                                itemToValue={identity}
                                color={areaGraphColors.good}
                                graphConfig={{ ...graphConfig.small, width: 50 }}
                                className="mb-3 inline-block"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div
            className="col-span-3 bg-white rounded-lg shadow border border-gray-200 p-3"
            style={style}
          >
            <h4 className="text-gray-950 text-base font-medium mb-4">Completed</h4>
            <table className="overview-table w-full">
              <thead className="text-base font-normal">
                <tr>
                  <td />
                  <td>
                    Velocity
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                  <td>
                    Cycle Time
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                  <td>
                    CLT
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                  <td>
                    Flow Efficiency
                    {/* <span className="inline-block pl-1">
                      <Info size={15} />
                    </span> */}
                  </td>
                </tr>
              </thead>
              <tbody>
                {pageConfig?.workItemsConfig
                  ?.filter(w => !isBugLike(w.name[0]))
                  .map(config => {
                    const matchingWorkItemType = ({
                      workItemType,
                    }: {
                      workItemType: string;
                    }) => workItemType === config.name[0];

                    return (
                      <tr key={config.name[0]}>
                        <td>
                          <RowLabel config={config} label={config.name[0]} />
                        </td>
                        <td>
                          <div className="flex flex-row items-center group">
                            {isDefined(stats.velocityWorkItems)
                              ? stats.velocityWorkItems.some(matchingWorkItemType)
                                ? num(
                                    stats.velocityWorkItems
                                      ?.find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.countsByWeek)
                                      .reduce((acc, curr) => acc + curr.count, 0) || 0
                                  )
                                : '-'
                              : null}
                            <button
                              type="button"
                              title="drawer-button"
                              onClick={() => {
                                setAdditionalDrawerProps({
                                  heading: `${config.name[0]}`,
                                  children: (
                                    <CycleTimeDrawer
                                      selectedTab="all"
                                      workItemConfig={config}
                                    />
                                  ),
                                });
                                openDrawer();
                              }}
                            >
                              <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
                            </button>
                            <div className="w-12">
                              <TinyAreaGraph
                                data={range(0, 12).map(weekIndex => {
                                  return (
                                    stats.velocityWorkItems
                                      ?.find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.countsByWeek)
                                      .filter(x => x.weekIndex === weekIndex)
                                      .reduce((acc, curr) => acc + curr.count, 0) || 0
                                  );
                                })}
                                itemToValue={identity}
                                color={areaGraphColors.good}
                                graphConfig={{ ...graphConfig.small, width: 50 }}
                                className="mb-3 inline-block"
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-row items-center group">
                            {isDefined(stats.cycleTimeWorkItems)
                              ? stats.cycleTimeWorkItems.some(matchingWorkItemType)
                                ? prettyMS(
                                    divide(
                                      stats.cycleTimeWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x => x.countsByWeek)
                                        ?.reduce(
                                          (acc, curr) => acc + curr.totalDuration,
                                          0
                                        ) || 0,
                                      stats.cycleTimeWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x => x.countsByWeek)
                                        ?.reduce((acc, curr) => acc + curr.count, 0) || 0
                                    ).getOr(0)
                                  )
                                : '-'
                              : null}
                            <button
                              type="button"
                              title="drawer-button"
                              onClick={() => {
                                setAdditionalDrawerProps({
                                  heading: `${config.name[1]}`,
                                  children: (
                                    <CycleTimeDrawer
                                      selectedTab="all"
                                      workItemConfig={config}
                                    />
                                  ),
                                });
                                openDrawer();
                              }}
                            >
                              <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
                            </button>
                            <div className="w-12">
                              <TinyAreaGraph
                                data={range(0, 12).map(weekIndex => {
                                  return (
                                    stats.cycleTimeWorkItems
                                      ?.find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.countsByWeek)
                                      .filter(x => x.weekIndex === weekIndex)
                                      .reduce((acc, curr) => acc + curr.count, 0) || 0
                                  );
                                })}
                                itemToValue={identity}
                                color={areaGraphColors.good}
                                graphConfig={{ ...graphConfig.small, width: 50 }}
                                className="mb-3 inline-block"
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-row items-center group">
                            {isDefined(stats.cltWorkItems)
                              ? stats.cltWorkItems.some(matchingWorkItemType)
                                ? prettyMS(
                                    divide(
                                      stats.cltWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x =>
                                          x.countsByWeek.map(y => y.totalDuration)
                                        )
                                        .reduce((acc, curr) => acc + curr, 0) || 0,
                                      stats.cltWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x =>
                                          x.countsByWeek.map(y => y.count)
                                        )
                                        .reduce((acc, curr) => acc + curr, 0) || 0
                                    ).getOr(0)
                                  )
                                : '-'
                              : null}
                            <button
                              type="button"
                              title="drawer-button"
                              onClick={() => {
                                setAdditionalDrawerProps({
                                  heading: `${config.name[1]}`,
                                  children: (
                                    <ChangeLeadTimeDrawer
                                      selectedTab="all"
                                      workItemConfig={config}
                                    />
                                  ),
                                });
                                openDrawer();
                              }}
                            >
                              <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
                            </button>
                            <div className="w-12">
                              <TinyAreaGraph
                                data={range(0, 12).map(weekIndex => {
                                  return (
                                    stats.cltWorkItems
                                      ?.find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.countsByWeek)
                                      .filter(x => x.weekIndex === weekIndex)
                                      .reduce((acc, curr) => acc + curr.count, 0) || 0
                                  );
                                })}
                                itemToValue={identity}
                                color={areaGraphColors.good}
                                graphConfig={{ ...graphConfig.small, width: 50 }}
                                className="mb-3 inline-block"
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-row items-center group">
                            {isDefined(stats.flowEfficiencyWorkItems)
                              ? stats.flowEfficiencyWorkItems.some(matchingWorkItemType)
                                ? divide(
                                    stats.flowEfficiencyWorkItems
                                      .find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.workCentersDuration)
                                      .reduce((acc, curr) => acc + curr, 0) || 0,
                                    stats.flowEfficiencyWorkItems
                                      .find(matchingWorkItemType)
                                      ?.data.flatMap(x => x.cycleTime)
                                      ?.reduce((acc, curr) => acc + curr, 0) || 0
                                  )
                                    .map(toPercentage)
                                    .getOr('-')
                                : '-'
                              : null}
                            <button
                              type="button"
                              title="drawer-button"
                              onClick={() => {
                                setAdditionalDrawerProps({
                                  heading: `${config.name[0]}`,
                                  children: (
                                    <CycleTimeDrawer
                                      selectedTab="all"
                                      workItemConfig={config}
                                    />
                                  ),
                                });
                                openDrawer();
                              }}
                            >
                              <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowMetrics;
