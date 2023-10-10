import type { ReactNode } from 'react';
import React, { Fragment, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { identity, multiply, prop, range } from 'rambda';
import { ExternalLink } from 'react-feather';

import type { DrawerDownloadSlugs } from '../../backend/server/repo-api-endpoints.js';
import useSse from '../hooks/use-merge-over-sse.js';
import { useQueryContext, useQueryPeriodDays } from '../hooks/query-hooks.js';
import type { ProjectOverviewStats } from '../../backend/models/project-overview.js';
import {
  bold,
  isDefined,
  minPluralise,
  num,
  pluralise,
  prettyMS,
} from '../helpers/utils.js';
import { divide, toPercentage } from '../../shared/utils.js';
import { Stat, SummaryCard } from '../components/SummaryCard.jsx';
import TinyAreaGraph, {
  areaGraphColors,
  decreaseIsBetter,
  graphConfig,
  increaseIsBetter,
} from '../components/graphs/TinyAreaGraph.jsx';
import { isBugLike } from '../../shared/work-item-utils.js';
import { useDrawer } from '../components/common/Drawer.jsx';
import { trpc } from '../helpers/trpc.js';
import UsageByEnv from '../components/UsageByEnv.jsx';
import QueryPeriodSelector from '../components/QueryPeriodSelector.jsx';
import Filters from '../components/OverviewGraphs2/Filters.jsx';
import TeamsSelector from '../components/teams-selector/TeamsSelector.jsx';
import type { SummaryStats } from '../../backend/models/repo-listing.js';
import type { ReleaseStatsSse } from '../../backend/models/release-listing.js';
import {
  useCreateUrlForOverview,
  useCreateUrlForReleasePipelinesSummary,
  useCreateUrlForRepoSummary,
} from '../helpers/sseUrlConfigs.js';

const style = { boxShadow: '0px 4px 8px rgba(30, 41, 59, 0.05)' };
const YAMLPipelinesDrawer = lazy(
  () => import('../components/repo-summary/YAMLPipelinesDrawer.jsx')
);
const SonarReposDrawer = lazy(
  () => import('../components/repo-summary/SonarReposDrawer.jsx')
);
const TestsDrawer = lazy(() => import('../components/repo-summary/TestsDrawer.jsx'));
const BuildPipelinesDrawer = lazy(
  () => import('../components/repo-summary/BuildPipelinesDrawer.jsx')
);
const CycleTimeDrawer = React.lazy(() =>
  import('../components/OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.CycleTimeDrawer,
  }))
);
const WIPTrendDrawer = React.lazy(() =>
  import('../components/OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.WIPTrendDrawer,
  }))
);
const NewDrawer = React.lazy(() =>
  import('../components/OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.NewDrawer,
  }))
);
const ChangeLeadTimeDrawer = React.lazy(() =>
  import('../components/OverviewGraphs2/Drawers.jsx').then(m => ({
    default: m.ChangeLeadTimeDrawer,
  }))
);

const useCreateDownloadUrl = () => {
  // Dirty hack, but works
  const url = useCreateUrlForRepoSummary('overview-v2/::placeholder::');
  return useCallback(
    (slug: DrawerDownloadSlugs) => {
      return url.replace('::placeholder::', slug);
    },
    [url]
  );
};

const OverviewWithMetrics = () => {
  const sseUrl = useCreateUrlForOverview('overview-v2');
  const repoSummarySseUrl = useCreateUrlForRepoSummary('repos/summary');
  const releasePipelinesSseUrl =
    useCreateUrlForReleasePipelinesSummary('release-pipelines');
  const drawerDownloadUrl = useCreateDownloadUrl();
  const projectOverviewStats = useSse<ProjectOverviewStats>(sseUrl, '0');
  const repoSummaryStats = useSse<SummaryStats>(repoSummarySseUrl, '0');
  const releasePipelinesSummaryStats = useSse<ReleaseStatsSse>(
    releasePipelinesSseUrl,
    '0'
  );
  const queryPeriodDays = useQueryPeriodDays();
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext,
  });

  const [Drawer, drawerProps, openDrawer] = useDrawer();
  const [additionalDrawerProps, setAdditionalDrawerProps] = useState<{
    heading: ReactNode;
    children: ReactNode;
    downloadUrl?: string;
  }>({
    heading: 'Loading...',
    children: 'Loading...',
  });

  const filtersRef = useRef<HTMLDivElement>(null);
  const [filterRenderCount, setFilterRenderCount] = useState(0);
  const [, setLayoutType] = useState<'2-col' | 'full-width'>('2-col');

  const relayout = useCallback(() => {
    setLayoutType((filtersRef.current?.offsetHeight || 0) > 100 ? 'full-width' : '2-col');
  }, [setLayoutType]);

  useEffect(() => {
    relayout();

    window.addEventListener('resize', relayout, false);
    return () => window.removeEventListener('resize', relayout, false);
  }, [filterRenderCount, relayout]);

  return (
    <div>
      <div className="text-left mb-6">
        <QueryPeriodSelector />
      </div>
      <Drawer {...drawerProps} {...additionalDrawerProps} />
      <div className="text-gray-950 text-2xl font-medium mb-3">Value Metrics</div>
      <Filters ref={filtersRef} setRenderCount={setFilterRenderCount} />
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
                {isDefined(projectOverviewStats.newWorkItems) &&
                isDefined(pageConfig.data?.workItemsConfig)
                  ? pageConfig.data?.workItemsConfig
                      .filter(w => !isBugLike(w.name[0]))
                      .map(config => {
                        return (
                          <tr key={config?.name[0]}>
                            <td>
                              <div className="flex flex-row">
                                <img
                                  src={config.icon}
                                  className="px-1"
                                  alt={`Icon for ${config.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{config.name[0]}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-row items-center group">
                                {num(
                                  projectOverviewStats.newWorkItems
                                    ?.find(x => x.workItemType === config.name[0])
                                    ?.data.flatMap(x => x.countsByWeek)
                                    .reduce((acc, curr) => acc + curr.count, 0) || 0
                                )}
                                <button
                                  type="button"
                                  title="drawer-button"
                                  onClick={() => {
                                    setAdditionalDrawerProps({
                                      heading: `${config.name[1]}`,
                                      children: (
                                        <NewDrawer
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
                                        projectOverviewStats.newWorkItems
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
                {isDefined(pageConfig.data?.workItemsConfig)
                  ? pageConfig.data?.workItemsConfig
                      .filter(w => !isBugLike(w.name[0]))
                      .map(config => {
                        return (
                          <tr key={config?.name[0]}>
                            <td>
                              <div className="flex flex-row">
                                <img
                                  src={config.icon}
                                  className="px-1"
                                  alt={`Icon for ${config.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{config.name[0]}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-row items-center group">
                                {isDefined(projectOverviewStats.wipTrendWorkItems)
                                  ? num(
                                      projectOverviewStats.wipTrendWorkItems
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
                                        projectOverviewStats.wipTrendWorkItems
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
                {isDefined(pageConfig.data?.workItemsConfig)
                  ? pageConfig.data?.workItemsConfig
                      .filter(w => !isBugLike(w.name[0]))
                      .map(config => {
                        const matchingWorkItemType = ({
                          workItemType,
                        }: {
                          workItemType: string;
                        }) => workItemType === config.name[0];

                        return (
                          <tr key={config.name[0]}>
                            <td>
                              <div className="flex flex-row">
                                <img
                                  src={config.icon}
                                  className="px-1"
                                  alt={`Icon for ${config.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{config.name[0]}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-row items-center group">
                                {isDefined(projectOverviewStats.velocityWorkItems)
                                  ? num(
                                      projectOverviewStats.velocityWorkItems
                                        ?.find(matchingWorkItemType)
                                        ?.data.flatMap(x => x.countsByWeek)
                                        .reduce((acc, curr) => acc + curr.count, 0) || 0
                                    )
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
                                        projectOverviewStats.velocityWorkItems
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
                                {isDefined(projectOverviewStats.cycleTimeWorkItems)
                                  ? prettyMS(
                                      divide(
                                        projectOverviewStats.cycleTimeWorkItems
                                          .find(matchingWorkItemType)
                                          ?.data.flatMap(x => x.countsByWeek)
                                          ?.reduce(
                                            (acc, curr) => acc + curr.totalDuration,
                                            0
                                          ) || 0,
                                        projectOverviewStats.cycleTimeWorkItems
                                          .find(matchingWorkItemType)
                                          ?.data.flatMap(x => x.countsByWeek)
                                          ?.reduce((acc, curr) => acc + curr.count, 0) ||
                                          0
                                      ).getOr(0)
                                    )
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
                                        projectOverviewStats.cycleTimeWorkItems
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
                                {isDefined(projectOverviewStats.cltWorkItems)
                                  ? prettyMS(
                                      divide(
                                        projectOverviewStats.cltWorkItems
                                          .find(matchingWorkItemType)
                                          ?.data.flatMap(x =>
                                            x.countsByWeek.map(y => y.totalDuration)
                                          )
                                          .reduce((acc, curr) => acc + curr, 0) || 0,
                                        projectOverviewStats.cltWorkItems
                                          .find(matchingWorkItemType)
                                          ?.data.flatMap(x =>
                                            x.countsByWeek.map(y => y.count)
                                          )
                                          .reduce((acc, curr) => acc + curr, 0) || 0
                                      ).getOr(0)
                                    )
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
                                        projectOverviewStats.cltWorkItems
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
                                {isDefined(projectOverviewStats.flowEfficiencyWorkItems)
                                  ? divide(
                                      projectOverviewStats.flowEfficiencyWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x => x.workCentersDuration)
                                        .reduce((acc, curr) => acc + curr, 0) || 0,
                                      projectOverviewStats.flowEfficiencyWorkItems
                                        .find(matchingWorkItemType)
                                        ?.data.flatMap(x => x.cycleTime)
                                        ?.reduce((acc, curr) => acc + curr, 0) || 0
                                    )
                                      .map(toPercentage)
                                      .getOr('-')
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
                      })
                  : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mt-6">
        <h2 className="mb-2 uppercase text-sm tracking-wide">Quality metrics</h2>
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
                {isDefined(projectOverviewStats.newWorkItems)
                  ? projectOverviewStats.newWorkItems
                      .find(w => isBugLike(w.workItemType))
                      ?.data.map(env => {
                        return (
                          <tr key={env.groupName}>
                            <td>
                              <div className="flex flex-row">
                                <img
                                  src={
                                    pageConfig.data?.workItemsConfig?.find(w =>
                                      isBugLike(w.name[0])
                                    )?.icon
                                  }
                                  className="px-1"
                                  alt={`Icon for ${pageConfig.data?.workItemsConfig?.find(
                                    w => isBugLike(w.name[0])
                                  )?.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{env.groupName}</span>
                              </div>
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
                                      heading: `${pageConfig.data?.workItemsConfig?.find(
                                        w => isBugLike(w.name[0])
                                      )?.name[1]}`,
                                      children: (
                                        <NewDrawer
                                          selectedTab={
                                            (env.countsByWeek
                                              .map(w => w.count)
                                              .reduce((acc, curr) => acc + curr) || 0) > 0
                                              ? env.groupName
                                              : 'all'
                                          }
                                          workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
                                        env.countsByWeek?.find(
                                          x => x.weekIndex === weekIndex
                                        )?.count || 0
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
                {isDefined(projectOverviewStats.wipTrendWorkItems)
                  ? projectOverviewStats.wipTrendWorkItems
                      .find(w => isBugLike(w.workItemType))
                      ?.data.map(env => {
                        return (
                          <tr key={env.groupName}>
                            <td>
                              <div className="flex flex-row">
                                <img
                                  src={
                                    pageConfig.data?.workItemsConfig?.find(w =>
                                      isBugLike(w.name[0])
                                    )?.icon
                                  }
                                  className="px-1"
                                  alt={`Icon for ${pageConfig.data?.workItemsConfig?.find(
                                    w => isBugLike(w.name[0])
                                  )?.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{env.groupName}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex flex-row items-center group">
                                {num(env.countsByWeek.at(-1)?.count || 0)}
                                <button
                                  type="button"
                                  title="drawer-button"
                                  onClick={() => {
                                    setAdditionalDrawerProps({
                                      heading: `${projectOverviewStats.wipTrendWorkItems?.find(
                                        x => isBugLike(x.workItemType)
                                      )?.workItemType}`,
                                      children: (
                                        <WIPTrendDrawer
                                          selectedTab={
                                            (env.countsByWeek.at(-1)?.count || 0) > 0
                                              ? env.groupName
                                              : 'all'
                                          }
                                          workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
                                        env.countsByWeek?.find(
                                          x => x.weekIndex === weekIndex
                                        )?.count || 0
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
                {isDefined(pageConfig.data?.environments)
                  ? pageConfig.data?.environments?.map(env => {
                      return (
                        <tr key={env}>
                          <td>
                            <div className="flex flex-row items-center group">
                              <div className="flex flex-row">
                                <img
                                  src={
                                    pageConfig.data?.workItemsConfig?.find(w =>
                                      isBugLike(w.name[0])
                                    )?.icon
                                  }
                                  className="px-1"
                                  alt={`Icon for ${pageConfig.data?.workItemsConfig?.find(
                                    w => isBugLike(w.name[0])
                                  )?.name[1]}`}
                                  width="25px"
                                />
                                <span className="inline-block">{env}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-row items-center group">
                              {isDefined(projectOverviewStats.velocityWorkItems)
                                ? num(
                                    projectOverviewStats.velocityWorkItems
                                      ?.find(x => isBugLike(x.workItemType))
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
                                    heading: `${projectOverviewStats.velocityWorkItems?.find(
                                      x => isBugLike(x.workItemType)
                                    )?.workItemType}`,
                                    children: (
                                      <CycleTimeDrawer
                                        selectedTab={
                                          (projectOverviewStats.velocityWorkItems
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0) > 0
                                            ? env
                                            : 'all'
                                        }
                                        workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
                                      projectOverviewStats.velocityWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
                                        ?.data.find(x => x.groupName === env)
                                        ?.countsByWeek?.find(
                                          x => x.weekIndex === weekIndex
                                        )?.count || 0
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
                              {isDefined(projectOverviewStats.cycleTimeWorkItems)
                                ? prettyMS(
                                    divide(
                                      projectOverviewStats.cycleTimeWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
                                        ?.data.find(x => x.groupName === env)
                                        ?.countsByWeek.reduce(
                                          (acc, curr) => acc + curr.totalDuration,
                                          0
                                        ) || 0,
                                      projectOverviewStats.cycleTimeWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
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
                                    heading: `${projectOverviewStats.cycleTimeWorkItems?.find(
                                      x => isBugLike(x.workItemType)
                                    )?.workItemType}`,
                                    children: (
                                      <CycleTimeDrawer
                                        selectedTab={
                                          (projectOverviewStats.cycleTimeWorkItems
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0) > 0
                                            ? env
                                            : 'all'
                                        }
                                        workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
                                      projectOverviewStats.cycleTimeWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
                                        ?.data.find(x => x.groupName === env)
                                        ?.countsByWeek?.find(
                                          x => x.weekIndex === weekIndex
                                        )?.count || 0
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
                              {isDefined(projectOverviewStats.cltWorkItems)
                                ? prettyMS(
                                    divide(
                                      projectOverviewStats.cltWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
                                        ?.data.find(x => x.groupName === env)
                                        ?.countsByWeek.reduce(
                                          (acc, curr) => acc + curr.totalDuration,
                                          0
                                        ) || 0,
                                      projectOverviewStats.cltWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
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
                                    heading: `${projectOverviewStats.cltWorkItems?.find(
                                      x => isBugLike(x.workItemType)
                                    )?.workItemType}`,
                                    children: (
                                      <ChangeLeadTimeDrawer
                                        selectedTab={
                                          (projectOverviewStats.cltWorkItems
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0) > 0
                                            ? env
                                            : 'all'
                                        }
                                        workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
                                      projectOverviewStats.cltWorkItems
                                        ?.find(x => isBugLike(x.workItemType))
                                        ?.data.find(x => x.groupName === env)
                                        ?.countsByWeek?.find(
                                          x => x.weekIndex === weekIndex
                                        )?.count || 0
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
                              {isDefined(projectOverviewStats.flowEfficiencyWorkItems)
                                ? divide(
                                    projectOverviewStats.flowEfficiencyWorkItems
                                      ?.find(x => isBugLike(x.workItemType))
                                      ?.data.find(x => x.groupName === env)
                                      ?.workCentersDuration || 0,
                                    projectOverviewStats.flowEfficiencyWorkItems
                                      ?.find(x => isBugLike(x.workItemType))
                                      ?.data.find(x => x.groupName === env)?.cycleTime ||
                                      0
                                  )
                                    .map(toPercentage)
                                    .getOr('-')
                                : null}
                              <button
                                type="button"
                                title="drawer-button"
                                onClick={() => {
                                  setAdditionalDrawerProps({
                                    heading: `${projectOverviewStats.flowEfficiencyWorkItems?.find(
                                      x => isBugLike(x.workItemType)
                                    )?.workItemType}`,
                                    children: (
                                      <CycleTimeDrawer
                                        selectedTab={
                                          (projectOverviewStats.cltWorkItems
                                            ?.find(x => isBugLike(x.workItemType))
                                            ?.data.find(x => x.groupName === env)
                                            ?.countsByWeek.reduce(
                                              (acc, curr) => acc + curr.count,
                                              0
                                            ) || 0) > 0
                                            ? env
                                            : 'all'
                                        }
                                        workItemConfig={pageConfig.data?.workItemsConfig?.find(
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
      <div className="text-2xl font-medium pt-6">Health Metrics</div>
      <TeamsSelector />
      <div className="my-3">
        {isDefined(repoSummaryStats.totalRepos) &&
        isDefined(repoSummaryStats.totalActiveRepos) &&
        repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos !== 0 ? (
          <p className="text-theme-helptext text-sm">
            {`Analyzed ${num(repoSummaryStats.totalActiveRepos)} repos, 
            Excluded `}
            <b className="text-theme-helptext-emphasis">
              {`${num(repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos)} `}
            </b>
            <span
              className="underline decoration-dashed"
              data-tooltip-id="react-tooltip"
              data-tooltip-html={[
                'A repository is considered inactive if it has had<br />',
                "<span class='font-medium'>no commits</span> and <span class='font-medium'>no builds</span>",
                `in the last ${queryPeriodDays} days`,
              ].join(' ')}
            >
              {`inactive ${minPluralise(
                repoSummaryStats.totalRepos - repoSummaryStats.totalActiveRepos,
                'repository',
                'repositories'
              )}`}
            </span>
            {' from analysis'}
          </p>
        ) : null}
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Test Automation</h3>
        <div className="grid grid-cols-6 grid-row-2 gap-6 mt-2">
          <SummaryCard className="col-span-3 grid grid-cols-2 gap-6 rounded-lg">
            <div className="border-r border-theme-seperator pr-6">
              <Stat
                title="Tests"
                tooltip={
                  isDefined(repoSummaryStats.defSummary) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        'Total number of tests from the<br />',
                        bold(num(repoSummaryStats.defSummary.reposWithTests)),
                        'out of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting test runs',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(repoSummaryStats.weeklyTestsSummary)) return null;
                  const lastMatch = repoSummaryStats.weeklyTestsSummary.findLast(
                    x => x.hasTests
                  );
                  if (!lastMatch) return '0';
                  if (!lastMatch.hasTests) {
                    throw new Error("Stupid TS can't figure out that hasTests is true");
                  }
                  return num(lastMatch.totalTests);
                })()}
                graphPosition="right"
                graphData={repoSummaryStats.weeklyTestsSummary}
                graphColor={
                  isDefined(repoSummaryStats.weeklyTestsSummary)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyTestsSummary.map(x =>
                          x.hasTests ? x.totalTests : 0
                        )
                      )
                    : null
                }
                graphItemToValue={x => (x.hasTests ? x.totalTests : undefined)}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.hasTests ? x.totalTests : 0)),
                    minPluralise(x.hasTests ? x.totalTests : 0, 'test', 'tests'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Test & coverage details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('tests-coverage-pipelines'),
                  body: <TestsDrawer pipelineType="all" />,
                }}
              />
            </div>
            <div className="h-full">
              <Stat
                title="Branch coverage"
                tooltip={
                  isDefined(repoSummaryStats.defSummary) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        'Coverage numbers are from only the<br />',
                        bold(num(repoSummaryStats.defSummary.reposWithCoverage)),
                        'out of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository',
                          'repositories'
                        ),
                        'reporting coverage',
                      ].join(' ')
                    : undefined
                }
                value={(() => {
                  if (!isDefined(repoSummaryStats.weeklyCoverageSummary)) return null;
                  const lastMatch = repoSummaryStats.weeklyCoverageSummary.findLast(
                    x => x.hasCoverage
                  );
                  if (!lastMatch) return '-';
                  if (!lastMatch.hasCoverage) {
                    throw new Error("TS can't figure out that hasTests is true");
                  }
                  return divide(lastMatch.coveredBranches, lastMatch.totalBranches)
                    .map(toPercentage)
                    .getOr('-');
                })()}
                graphPosition="right"
                graphData={repoSummaryStats.weeklyCoverageSummary}
                graphColor={
                  isDefined(repoSummaryStats.weeklyCoverageSummary)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyCoverageSummary.map(week => {
                          return divide(
                            week.hasCoverage ? week.coveredBranches : 0,
                            week.hasCoverage ? week.totalBranches : 0
                          )
                            .map(multiply(100))
                            .getOr(0);
                        })
                      )
                    : null
                }
                graphItemToValue={x => {
                  return divide(
                    x.hasCoverage ? x.coveredBranches : 0,
                    x.hasCoverage ? x.totalBranches : 0
                  )
                    .map(multiply(100))
                    .getOr(0);
                }}
                graphDataPointLabel={x =>
                  [
                    bold(
                      divide(
                        x.hasCoverage ? x.coveredBranches : 0,
                        x.hasCoverage ? x.totalBranches : 0
                      )
                        .map(toPercentage)
                        .getOr('Unknown')
                    ),
                    'branch coverage',
                  ].join(' ')
                }
              />
            </div>
          </SummaryCard>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Code quality</h3>
        <div className="grid grid-cols-6 grid-row-2 gap-6 mt-2">
          <SummaryCard className="col-span-3 row-span-2 grid grid-cols-2 gap-6 rounded-lg">
            <div className="row-span-2 border-r border-theme-seperator pr-6">
              <Stat
                title="SonarQube"
                tooltip={
                  isDefined(repoSummaryStats.reposWithSonarQube) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? [
                        bold(num(repoSummaryStats.reposWithSonarQube)),
                        'of',
                        bold(num(repoSummaryStats.totalActiveRepos)),
                        minPluralise(
                          repoSummaryStats.totalActiveRepos,
                          'repository has',
                          'repositories have'
                        ),
                        'SonarQube configured',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.reposWithSonarQube) &&
                  isDefined(repoSummaryStats.totalActiveRepos)
                    ? divide(
                        repoSummaryStats.reposWithSonarQube,
                        repoSummaryStats.totalActiveRepos
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="bottom"
                graphData={repoSummaryStats.weeklyReposWithSonarQubeCount}
                graphColor={
                  isDefined(repoSummaryStats.weeklyReposWithSonarQubeCount)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklyReposWithSonarQubeCount.map(w => w.count)
                      )
                    : null
                }
                graphItemToValue={prop('count')}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.count)),
                    minPluralise(x.count, 'repopsitory', 'repositories'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="all" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Ok"
                tooltip={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? [
                        bold(num(repoSummaryStats.sonarProjects.passedProjects)),
                        'of',
                        bold(num(repoSummaryStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          repoSummaryStats.sonarProjects.totalProjects,
                          'project has',
                          'projects have'
                        ),
                        "'pass' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? divide(
                        repoSummaryStats.sonarProjects.passedProjects,
                        repoSummaryStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={repoSummaryStats.weeklySonarProjectsCount}
                graphItemToValue={prop('passedProjects')}
                graphColor={
                  isDefined(repoSummaryStats.weeklySonarProjectsCount)
                    ? increaseIsBetter(
                        repoSummaryStats.weeklySonarProjectsCount.map(
                          s => s.passedProjects
                        )
                      )
                    : null
                }
                graphDataPointLabel={x =>
                  [
                    bold(num(x.passedProjects)),
                    'SonarQube',
                    minPluralise(x.passedProjects, 'project', 'projects'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="pass" />,
                }}
              />
            </div>
            <div>
              <Stat
                title="Fail"
                tooltip={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? [
                        bold(num(repoSummaryStats.sonarProjects.failedProjects)),
                        'of',
                        bold(num(repoSummaryStats.sonarProjects.totalProjects)),
                        'SonarQube',
                        minPluralise(
                          repoSummaryStats.sonarProjects.failedProjects,
                          'project has',
                          'projects have'
                        ),
                        "'fail' quality gate",
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.sonarProjects)
                    ? divide(
                        repoSummaryStats.sonarProjects.failedProjects,
                        repoSummaryStats.sonarProjects.totalProjects
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                graphPosition="right"
                graphData={repoSummaryStats.weeklySonarProjectsCount}
                graphColor={decreaseIsBetter(
                  repoSummaryStats.weeklySonarProjectsCount?.map(s => s.failedProjects) ||
                    []
                )}
                graphItemToValue={prop('failedProjects')}
                graphDataPointLabel={x =>
                  [
                    bold(num(x.failedProjects)),
                    'SonarQube',
                    minPluralise(x.failedProjects, 'project', 'projects'),
                  ].join(' ')
                }
                onClick={{
                  open: 'drawer',
                  heading: 'SonarQube',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('sonar-projects'),
                  body: <SonarReposDrawer projectsType="fail" />,
                }}
              />
            </div>
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1 rounded-lg">
            <Stat
              title="Healthy branches"
              tooltip={
                isDefined(repoSummaryStats.healthyBranches)
                  ? [
                      bold(num(repoSummaryStats.healthyBranches.healthy)),
                      'out of',
                      bold(num(repoSummaryStats.healthyBranches.total)),
                      minPluralise(
                        repoSummaryStats.healthyBranches.total,
                        'branch is',
                        'branches are'
                      ),
                      'healthy',
                    ].join(' ')
                  : undefined
              }
              value={
                isDefined(repoSummaryStats.healthyBranches)
                  ? divide(
                      repoSummaryStats.healthyBranches.healthy,
                      repoSummaryStats.healthyBranches.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : null
              }
            />
          </SummaryCard>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">CI builds</h3>
        <SummaryCard className="col-span-6 rounded-lg mt-2">
          <div className="grid grid-cols-4 gap-6">
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Builds"
                tooltip="Total number of builds across all matching repos"
                value={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? num(repoSummaryStats.totalBuilds.count)
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="all" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? increaseIsBetter(
                        repoSummaryStats.totalBuilds.byWeek.map(week => week.count)
                      )
                    : null
                }
                graphData={repoSummaryStats.totalBuilds?.byWeek}
                graphDataPointLabel={x => `${bold(num(x.count))} builds`}
                graphItemToValue={prop('count')}
              />
            </div>
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="Success"
                tooltip={
                  isDefined(repoSummaryStats.successfulBuilds) &&
                  isDefined(repoSummaryStats.totalBuilds)
                    ? [
                        bold(num(repoSummaryStats.successfulBuilds.count)),
                        'out of',
                        bold(num(repoSummaryStats.totalBuilds.count)),
                        minPluralise(
                          repoSummaryStats.totalBuilds.count,
                          'build has',
                          'builds have'
                        ),
                        'succeeded',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.successfulBuilds) &&
                  isDefined(repoSummaryStats.totalBuilds)
                    ? divide(
                        repoSummaryStats.successfulBuilds.count,
                        repoSummaryStats.totalBuilds.count
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="currentlySucceeding" />,
                }}
                graphPosition="right"
                graphColor={
                  isDefined(repoSummaryStats.totalBuilds)
                    ? increaseIsBetter(
                        repoSummaryStats.totalBuilds.byWeek.map(build => {
                          const successfulBuildsForWeek = isDefined(
                            repoSummaryStats.successfulBuilds
                          )
                            ? repoSummaryStats.successfulBuilds.byWeek.find(
                                s => s.weekIndex === build.weekIndex
                              )
                            : null;
                          return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                            .map(multiply(100))
                            .getOr(0);
                        })
                      )
                    : null
                }
                graphData={repoSummaryStats.totalBuilds?.byWeek}
                graphItemToValue={build => {
                  const successfulBuildsForWeek = isDefined(
                    repoSummaryStats.successfulBuilds
                  )
                    ? repoSummaryStats.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      )
                    : undefined;
                  return divide(successfulBuildsForWeek?.count ?? 0, build.count)
                    .map(multiply(100))
                    .getOr(0);
                }}
                graphDataPointLabel={build => {
                  const successfulBuildsForWeek = isDefined(
                    repoSummaryStats.successfulBuilds
                  )
                    ? repoSummaryStats.successfulBuilds.byWeek.find(
                        s => s.weekIndex === build.weekIndex
                      )
                    : undefined;
                  return [
                    bold(
                      divide(successfulBuildsForWeek?.count ?? 0, build.count)
                        .map(toPercentage)
                        .getOr('Unknown')
                    ),
                    'success rate',
                  ].join(' ');
                }}
              />
            </div>
            <div className="pr-6 border-r border-theme-seperator">
              <Stat
                title="YAML pipelines"
                tooltip={
                  isDefined(repoSummaryStats.pipelines)
                    ? [
                        bold(num(repoSummaryStats.pipelines.yamlCount)),
                        'of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.pipelines.totalCount,
                          'pipeline is',
                          'pipelines are'
                        ),
                        'set up using a YAML-based configuration',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.pipelines)
                    ? divide(
                        repoSummaryStats.pipelines.yamlCount,
                        repoSummaryStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Pipeline details',
                  enabledIf: (repoSummaryStats?.pipelines?.totalCount || 0) > 0,
                  downloadUrl: drawerDownloadUrl('yaml-pipelines'),
                  body: (
                    <YAMLPipelinesDrawer
                      totalPipelines={repoSummaryStats?.pipelines?.totalCount || 0}
                      yamlPipelines={repoSummaryStats?.pipelines?.yamlCount || 0}
                    />
                  ),
                }}
              />
            </div>
            <div>
              <Stat
                title="Central template"
                tooltip={
                  isDefined(repoSummaryStats.centralTemplatePipeline) &&
                  isDefined(repoSummaryStats.pipelines) &&
                  isDefined(repoSummaryStats.centralTemplateUsage) &&
                  isDefined(repoSummaryStats.totalBuilds) &&
                  isDefined(repoSummaryStats.activePipelinesCount) &&
                  isDefined(repoSummaryStats.activePipelineWithCentralTemplateCount) &&
                  isDefined(repoSummaryStats.activePipelineCentralTemplateBuilds) &&
                  isDefined(repoSummaryStats.activePipelineBuilds)
                    ? [
                        bold(
                          num(
                            repoSummaryStats.centralTemplatePipeline
                              .totalCentralTemplatePipelines
                          )
                        ),
                        'out of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template',
                        '<div class="mt-1">',
                        bold(num(repoSummaryStats.centralTemplatePipeline.central)),
                        'out of',
                        bold(num(repoSummaryStats.pipelines.totalCount)),
                        minPluralise(
                          repoSummaryStats.centralTemplatePipeline.central,
                          'build pipeline',
                          'build pipelines'
                        ),
                        'use the central template on the master branch',
                        '</div>',
                        '<div class="mt-1">',
                        bold(num(repoSummaryStats.centralTemplateUsage.templateUsers)),
                        'out of',
                        bold(num(repoSummaryStats.totalBuilds.count)),
                        minPluralise(
                          repoSummaryStats.centralTemplateUsage.templateUsers,
                          'build run',
                          'build runs'
                        ),
                        'used the central template',
                        '</div>',
                      ].join(' ')
                    : undefined
                }
                value={
                  isDefined(repoSummaryStats.centralTemplatePipeline) &&
                  isDefined(repoSummaryStats.pipelines)
                    ? divide(
                        repoSummaryStats.centralTemplatePipeline
                          .totalCentralTemplatePipelines,
                        repoSummaryStats.pipelines.totalCount
                      )
                        .map(toPercentage)
                        .getOr('-')
                    : null
                }
                onClick={{
                  open: 'drawer',
                  heading: 'Build details',
                  enabledIf: (repoSummaryStats?.totalActiveRepos || 0) > 0,
                  downloadUrl: drawerDownloadUrl('build-pipelines'),
                  body: <BuildPipelinesDrawer pipelineType="usingCentralTemplate" />,
                }}
              />
            </div>
          </div>
        </SummaryCard>
      </div>
      <div className="mt-6">
        <h3 className="uppercase text-sm tracking-wide">Releases</h3>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 rounded-lg mt-2 gap-6">
            <div className="grid grid-cols-2 gap-6">
              {isDefined(releasePipelinesSummaryStats.releases) &&
              isDefined(releasePipelinesSummaryStats.releases?.stagesToHighlight) ? (
                releasePipelinesSummaryStats.releases.stagesToHighlight.map(stage => (
                  <Fragment key={stage.name}>
                    <div className="pr-6 border-r border-theme-seperator">
                      <Stat
                        title={`${stage.name}: exists`}
                        value={divide(
                          stage.exists,
                          releasePipelinesSummaryStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.exists)} out of ${pluralise(
                          releasePipelinesSummaryStats.releases?.pipelineCount || 0,
                          'release pipeline has',
                          'release pipelines have'
                        )} a stage named (or containing) ${stage.name}.`}
                      />
                    </div>
                    <div>
                      <Stat
                        title={`${stage.name}: used`}
                        value={divide(
                          stage.used,
                          releasePipelinesSummaryStats.releases?.pipelineCount || 0
                        )
                          .map(toPercentage)
                          .getOr('-')}
                        tooltip={`${num(stage.used)} out of ${pluralise(
                          releasePipelinesSummaryStats.releases?.pipelineCount || 0,
                          'release piipeline has',
                          'release pipelines have'
                        )} a successful deployment from ${stage.name}.`}
                      />
                    </div>
                  </Fragment>
                ))
              ) : (
                <div className="col-span-2">
                  <Stat title="Stages to highlight" value="-" />
                </div>
              )}
            </div>
          </SummaryCard>

          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Conforms to branch policies"
              value={
                isDefined(releasePipelinesSummaryStats.releasesBranchPolicy)
                  ? divide(
                      releasePipelinesSummaryStats.releasesBranchPolicy.conforms,
                      releasePipelinesSummaryStats.releasesBranchPolicy.total
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesSummaryStats.releasesBranchPolicy) &&
                isDefined(releasePipelinesSummaryStats.releases)
                  ? `${num(
                      releasePipelinesSummaryStats.releasesBranchPolicy.conforms
                    )} out of ${pluralise(
                      releasePipelinesSummaryStats.releasesBranchPolicy.total,
                      'artifact is',
                      'artifacts are'
                    )} from branches that conform<br />to the branch policy.${
                      isDefined(releasePipelinesSummaryStats.releases.ignoredStagesBefore)
                        ? `<br />Artifacts that didn't go to ${releasePipelinesSummaryStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
          <SummaryCard className="col-span-1 rounded-lg mt-2 gap-6">
            <Stat
              title="Starts with artifact"
              value={
                isDefined(releasePipelinesSummaryStats.releases)
                  ? divide(
                      releasePipelinesSummaryStats.releases.startsWithArtifact,
                      releasePipelinesSummaryStats.releases.pipelineCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesSummaryStats.releases)
                  ? `${num(
                      releasePipelinesSummaryStats.releases.startsWithArtifact
                    )} of ${pluralise(
                      releasePipelinesSummaryStats.releases.pipelineCount,
                      'pipeliine',
                      'pipelines'
                    )} started with an artifact`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
        <div className="grid grid-cols-4 grid-row-2 gap-6 mt-2 col-span-6">
          <SummaryCard className="col-span-2 row-span-2 grid grid-cols-2 gap-6 rounded-lg">
            {isDefined(releasePipelinesSummaryStats.usageByEnv) ? (
              <div className="col-span-2">
                <h3 className="font-semibold mb-3 flex items-center">
                  Usage By Environments
                </h3>
                <UsageByEnv perEnvUsage={releasePipelinesSummaryStats.usageByEnv} />
              </div>
            ) : (
              <div className="col-span-2">
                <Stat title="Usage By Environments" value="-" />
              </div>
            )}
          </SummaryCard>
          <SummaryCard className="col-span-1 row-span-1 rounded-lg">
            <Stat
              title="Master-only releases"
              value={
                isDefined(releasePipelinesSummaryStats.releases)
                  ? divide(
                      releasePipelinesSummaryStats.releases.masterOnly,
                      releasePipelinesSummaryStats.releases.runCount
                    )
                      .map(toPercentage)
                      .getOr('-')
                  : '-'
              }
              tooltip={
                isDefined(releasePipelinesSummaryStats.releases)
                  ? `${num(
                      releasePipelinesSummaryStats.releases.masterOnly
                    )} out of ${pluralise(
                      releasePipelinesSummaryStats.releases.runCount,
                      'release was',
                      'releases were'
                    )} exclusively from master.${
                      releasePipelinesSummaryStats.releases.ignoredStagesBefore
                        ? `<br />Pipeline runs that didn't go to ${releasePipelinesSummaryStats.releases.ignoredStagesBefore} are not considered.`
                        : ''
                    }`
                  : undefined
              }
            />
          </SummaryCard>
        </div>
      </div>
    </div>
  );
};

export default OverviewWithMetrics;
