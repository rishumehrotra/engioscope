import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { identity, range } from 'rambda';
import { ExternalLink } from 'react-feather';
import { isDefined, num, prettyMS } from '../../helpers/utils.js';
import { divide, exists, toPercentage, unique } from '../../../shared/utils.js';
import TinyAreaGraph, { areaGraphColors, graphConfig } from '../graphs/TinyAreaGraph.js';
import { isBugLike } from '../../../shared/work-item-utils.js';
import { useDrawer } from '../common/Drawer.js';
import type { RouterClient } from '../../helpers/trpc.js';
import type { ProjectOverviewStats } from '../../../backend/models/project-overview.js';
import RowLabel from './RowLabel.jsx';

const style = { boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.05)' };
const CycleTimeDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.js').then(m => ({
    default: m.CycleTimeDrawer,
  }))
);
const WIPTrendDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.js').then(m => ({
    default: m.WIPTrendDrawer,
  }))
);
const NewDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.js').then(m => ({
    default: m.NewDrawer,
  }))
);
const ChangeLeadTimeDrawer = React.lazy(() =>
  import('../OverviewGraphs2/Drawers.js').then(m => ({
    default: m.ChangeLeadTimeDrawer,
  }))
);

type QualityMetricsProps = {
  stats: Partial<ProjectOverviewStats>;
  pageConfig: RouterClient['workItems']['getPageConfig'] | undefined;
};

const QualityMetrics: React.FC<QualityMetricsProps> = ({ stats, pageConfig }) => {
  const allDataFlattened = useMemo(
    () =>
      [
        stats?.newWorkItems,
        stats?.wipTrendWorkItems,
        stats?.velocityWorkItems,
        stats?.cycleTimeWorkItems,
        stats?.cltWorkItems,
        stats?.flowEfficiencyWorkItems,
      ]
        .filter(exists)
        .flat(),
    [
      stats?.cltWorkItems,
      stats?.cycleTimeWorkItems,
      stats?.flowEfficiencyWorkItems,
      stats?.newWorkItems,
      stats?.velocityWorkItems,
      stats?.wipTrendWorkItems,
    ]
  );

  const allWorkItemTypes = useMemo(
    () => unique(allDataFlattened.map(x => x.workItemType)),
    [allDataFlattened]
  );

  const sortedEnvs = useCallback(
    (workItemType: string) => {
      if (!stats) return;

      const envs = unique(
        allDataFlattened
          .filter(x => x.workItemType === workItemType)
          .flatMap(x => x.data.map(x => x.groupName))
      );

      return envs.sort((a, b) => {
        if (!pageConfig?.environments) return 1;
        if (!pageConfig.environments.includes(a)) return 1;
        if (!pageConfig.environments.includes(b)) return 1;

        return pageConfig.environments.indexOf(a) - pageConfig.environments.indexOf(b);
      });
    },
    [allDataFlattened, pageConfig?.environments, stats]
  );

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
      {allWorkItemTypes.filter(isBugLike).map(workItemType => {
        const environments = sortedEnvs(workItemType);
        const config = pageConfig?.workItemsConfig?.find(w => w.name[0] === workItemType);

        return (
          <div className="mt-6" key={workItemType}>
            <h2 className="mb-2 uppercase text-sm tracking-wide flex">
              <span>Quality metrics for&nbsp;</span>
              {config?.name[1]}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div
                className="bg-white rounded-lg shadow border border-gray-200 p-3"
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
                      ? stats.newWorkItems
                          .find(w => w.workItemType === workItemType)
                          ?.data.map(env => {
                            return (
                              <tr key={env.groupName}>
                                <td>
                                  {config ? (
                                    <RowLabel config={config} label={env.groupName} />
                                  ) : null}
                                </td>
                                <td>
                                  <div className="flex flex-row items-center group">
                                    {num(
                                      env.countsByWeek
                                        .map(w => w.count)
                                        .reduce((acc, curr) => acc + curr) || 0
                                    )}
                                    <button
                                      type="button"
                                      title="drawer-button"
                                      onClick={() => {
                                        setAdditionalDrawerProps({
                                          heading: `${config?.name[1]}`,
                                          children: (
                                            <NewDrawer
                                              selectedTab={
                                                (env.countsByWeek
                                                  .map(w => w.count)
                                                  .reduce((acc, curr) => acc + curr) ||
                                                  0) > 0
                                                  ? env.groupName
                                                  : 'all'
                                              }
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
                                            env.countsByWeek?.find(
                                              x => x.weekIndex === weekIndex
                                            )?.count || 0
                                          );
                                        })}
                                        itemToValue={identity}
                                        color={areaGraphColors.good}
                                        graphConfig={{
                                          ...graphConfig.small,
                                          width: 50,
                                        }}
                                        className="mb-3 inline-block"
                                      />
                                    </div>
                                  </div>
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
                <h4 className="text-gray-950 text-base font-medium mb-4">
                  Work in progress
                </h4>
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
                    {isDefined(stats.wipTrendWorkItems)
                      ? stats.wipTrendWorkItems
                          .find(w => w.workItemType === workItemType)
                          ?.data.map(env => {
                            return (
                              <tr key={env.groupName}>
                                <td>
                                  {config ? (
                                    <RowLabel config={config} label={env.groupName} />
                                  ) : null}
                                </td>
                                <td>
                                  <div className="flex flex-row items-center group">
                                    {num(env.countsByWeek.at(-1)?.count || 0)}
                                    <button
                                      type="button"
                                      title="drawer-button"
                                      onClick={() => {
                                        setAdditionalDrawerProps({
                                          heading: workItemType,
                                          children: (
                                            <WIPTrendDrawer
                                              selectedTab={
                                                (env.countsByWeek.at(-1)?.count || 0) > 0
                                                  ? env.groupName
                                                  : 'all'
                                              }
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
                                            env.countsByWeek?.find(
                                              x => x.weekIndex === weekIndex
                                            )?.count || 0
                                          );
                                        })}
                                        itemToValue={identity}
                                        color={areaGraphColors.good}
                                        graphConfig={{
                                          ...graphConfig.small,
                                          width: 50,
                                        }}
                                        className="mb-3 inline-block"
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      : null}
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
                    {isDefined(environments)
                      ? environments.map(env => {
                          return (
                            <tr key={env}>
                              <td>
                                <div className="flex flex-row items-center group">
                                  {config ? (
                                    <RowLabel config={config} label={env} />
                                  ) : null}
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-row items-center group">
                                  {isDefined(stats.velocityWorkItems)
                                    ? num(
                                        stats.velocityWorkItems
                                          ?.find(w => w.workItemType === workItemType)
                                          ?.data.find(x => x.groupName === env)
                                          ?.countsByWeek.reduce(
                                            (acc, curr) => acc + curr.count,
                                            0
                                          ) || 0
                                      )
                                    : null}
                                  <button
                                    type="button"
                                    title="drawer-button"
                                    onClick={() => {
                                      setAdditionalDrawerProps({
                                        heading: workItemType,
                                        children: (
                                          <CycleTimeDrawer
                                            selectedTab={
                                              (stats.velocityWorkItems
                                                ?.find(
                                                  w => w.workItemType === workItemType
                                                )
                                                ?.data.find(x => x.groupName === env)
                                                ?.countsByWeek.reduce(
                                                  (acc, curr) => acc + curr.count,
                                                  0
                                                ) || 0) > 0
                                                ? env
                                                : 'all'
                                            }
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
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek?.find(
                                              x => x.weekIndex === weekIndex
                                            )?.count || 0
                                        );
                                      })}
                                      itemToValue={identity}
                                      color={areaGraphColors.good}
                                      graphConfig={{
                                        ...graphConfig.small,
                                        width: 50,
                                      }}
                                      className="mb-3 inline-block"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-row items-center group">
                                  {isDefined(stats.cycleTimeWorkItems)
                                    ? prettyMS(
                                        divide(
                                          stats.cycleTimeWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.totalDuration,
                                              0
                                            ) || 0,
                                          stats.cycleTimeWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0
                                        ).getOr(0)
                                      )
                                    : null}
                                  <button
                                    type="button"
                                    title="drawer-button"
                                    onClick={() => {
                                      setAdditionalDrawerProps({
                                        heading: workItemType,
                                        children: (
                                          <CycleTimeDrawer
                                            selectedTab={
                                              (stats.cycleTimeWorkItems
                                                ?.find(x => isBugLike(x.workItemType))
                                                ?.data.find(x => x.groupName === env)
                                                ?.countsByWeek.reduce(
                                                  (acc, curr) => acc + curr.count,
                                                  0
                                                ) || 0) > 0
                                                ? env
                                                : 'all'
                                            }
                                            workItemConfig={pageConfig?.workItemsConfig?.find(
                                              w => isBugLike(w.name[0])
                                            )}
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
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek?.find(
                                              x => x.weekIndex === weekIndex
                                            )?.count || 0
                                        );
                                      })}
                                      itemToValue={identity}
                                      color={areaGraphColors.good}
                                      graphConfig={{
                                        ...graphConfig.small,
                                        width: 50,
                                      }}
                                      className="mb-3 inline-block"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-row items-center group">
                                  {isDefined(stats.cltWorkItems)
                                    ? prettyMS(
                                        divide(
                                          stats.cltWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.totalDuration,
                                              0
                                            ) || 0,
                                          stats.cltWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0
                                        ).getOr(0)
                                      )
                                    : null}
                                  <button
                                    type="button"
                                    title="drawer-button"
                                    onClick={() => {
                                      setAdditionalDrawerProps({
                                        heading: workItemType,
                                        children: (
                                          <ChangeLeadTimeDrawer
                                            selectedTab={
                                              (stats.cltWorkItems
                                                ?.find(
                                                  w => w.workItemType === workItemType
                                                )
                                                ?.data.find(x => x.groupName === env)
                                                ?.countsByWeek.reduce(
                                                  (acc, curr) => acc + curr.count,
                                                  0
                                                ) || 0) > 0
                                                ? env
                                                : 'all'
                                            }
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
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek?.find(
                                              x => x.weekIndex === weekIndex
                                            )?.count || 0
                                        );
                                      })}
                                      itemToValue={identity}
                                      color={areaGraphColors.good}
                                      graphConfig={{
                                        ...graphConfig.small,
                                        width: 50,
                                      }}
                                      className="mb-3 inline-block"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="flex flex-row items-center group">
                                  {isDefined(stats.flowEfficiencyWorkItems)
                                    ? stats.flowEfficiencyWorkItems.some(
                                        w => w.workItemType === workItemType
                                      )
                                      ? divide(
                                          stats.flowEfficiencyWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.workCentersDuration || 0,
                                          stats.flowEfficiencyWorkItems
                                            ?.find(w => w.workItemType === workItemType)
                                            ?.data.find(x => x.groupName === env)
                                            ?.cycleTime || 0
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
                                        heading: `${workItemType}`,
                                        children: (
                                          <CycleTimeDrawer
                                            selectedTab={
                                              (stats.cltWorkItems
                                                ?.find(
                                                  w => w.workItemType === workItemType
                                                )
                                                ?.data.find(x => x.groupName === env)
                                                ?.countsByWeek.reduce(
                                                  (acc, curr) => acc + curr.count,
                                                  0
                                                ) || 0) > 0
                                                ? env
                                                : 'all'
                                            }
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
                        })
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QualityMetrics;
