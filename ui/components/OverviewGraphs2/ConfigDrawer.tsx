/* eslint-disable no-console */
import React from 'react';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx';

export const ConfigDrawer = () => {
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery(
    { queryContext },
    { keepPreviousData: true }
  );

  return (
    <div>
      <DrawerTabs
        tabs={
          pageConfig.data?.workItemsConfig?.map(config => ({
            title: config.name[0],
            key: config.name[1],
            // eslint-disable-next-line react/no-unstable-nested-components
            BodyComponent: () => {
              const groupByAndStates =
                trpc.workItems.getGroupByFieldAndStatesForWorkType.useQuery(
                  {
                    collectionName: queryContext[0],
                    project: queryContext[1],
                    workItemType: config.name[0],
                  },
                  { keepPreviousData: true }
                );

              return (
                <form className="p-6">
                  <div className="text-gray-950 text-sm font-medium pt-3">
                    Start States
                  </div>
                  <div className="text-gray-600 text-sm font-normal pb-2">
                    Start feature work in this state. This will be reflected on the 'New
                    Work Items' graph and the 'Cycle Time' graph.
                  </div>
                  <MultiSelectDropdown
                    value={config.startStates}
                    options={(groupByAndStates.data?.states || []).map(state => ({
                      label: state.name,
                      value: state.name,
                    }))}
                    onChange={state => console.log(state)}
                  />
                  <div className="text-gray-950 text-sm font-medium  pt-5">
                    End States
                  </div>
                  <div className="text-gray-600 text-sm font-normal pb-2">
                    End feature work in this state. This will be reflected on the
                    'Velocity' graph and the 'Cycle Time' graph.
                  </div>
                  <MultiSelectDropdown
                    value={config.endStates}
                    options={(groupByAndStates.data?.states || []).map(state => ({
                      label: state.name,
                      value: state.name,
                    }))}
                    onChange={state => console.log(state)}
                  />
                  <div className="text-gray-950 text-sm font-medium  pt-5">
                    Dev Completion States
                  </div>
                  <div className="text-gray-600 text-sm font-normal pb-2">
                    Development is completed in this state. This will be reflected on the
                    the 'Cycle Time' graph.
                  </div>
                  <MultiSelectDropdown
                    value={config.devCompleteStates || []}
                    options={(groupByAndStates.data?.states || []).map(state => ({
                      label: state.name,
                      value: state.name,
                    }))}
                    onChange={state => console.log(state)}
                  />
                  <div className="text-gray-950 text-sm font-medium  pt-5">
                    Group by Field
                  </div>
                  <div className="text-gray-600 text-sm font-normal  pb-2">
                    Select the fields for which filtering capabilities are desired
                  </div>
                  <MultiSelectDropdown
                    value={
                      config.groupByField
                        ? Object.entries(config.groupByField).map(gf => gf[0])
                        : []
                    }
                    options={(groupByAndStates.data?.fields || []).map(f => ({
                      label: f.name,
                      value: f.name,
                    }))}
                    onChange={state => console.log(state)}
                  />
                  <div className="text-gray-950 text-sm font-medium pt-5">
                    Ignored States
                  </div>
                  <div className="text-gray-600 text-sm font-normal pb-2">
                    Work items in this state will not be considered for analysis
                  </div>
                  <MultiSelectDropdown
                    value={config.ignoreStates || []}
                    options={(groupByAndStates.data?.states || []).map(state => ({
                      label: state.name,
                      value: state.name,
                    }))}
                    onChange={state => console.log(state)}
                  />
                  <div className="text-gray-950 text-sm font-medium pt-5">
                    Work Centers
                  </div>
                  <div className="text-gray-600 text-sm font-normal">
                    Work centers are states where work actually happens. You may define a
                    work center by clicking on the link above.
                  </div>
                  {config.workCenters && config.workCenters.length > 0
                    ? config.workCenters.map(workCenter => (
                        <div>
                          <div className="text-gray-950 text-sm font-medium pt-3">
                            Label
                          </div>
                          <div className="text-gray-600 text-sm font-normal pb-2">
                            Name of the Work Center.
                          </div>

                          <input
                            type="text"
                            placeholder="Enter workcenter label"
                            value={workCenter.label}
                            onChange={state => console.log(state)}
                          />
                          <div className="text-gray-950 text-sm font-medium pt-3">
                            Start States
                          </div>
                          <div className="text-gray-600 text-sm font-normal pb-2">
                            Start feature work in this state. This will be reflected on
                            the 'New Work Items' graph and the 'Cycle Time' graph.
                          </div>
                          <MultiSelectDropdown
                            value={workCenter.startStates || []}
                            options={(groupByAndStates.data?.states || []).map(state => ({
                              label: state.name,
                              value: state.name,
                            }))}
                            onChange={state => console.log(state)}
                          />
                          <div className="text-gray-950 text-sm font-medium  pt-5">
                            End States
                          </div>
                          <div className="text-gray-600 text-sm font-normal pb-2">
                            End feature work in this state. This will be reflected on the
                            'Velocity' graph and the 'Cycle Time' graph.
                          </div>
                          <MultiSelectDropdown
                            value={workCenter.endStates || []}
                            options={(groupByAndStates.data?.states || []).map(state => ({
                              label: state.name,
                              value: state.name,
                            }))}
                            onChange={state => console.log(state)}
                          />
                        </div>
                      ))
                    : null}
                </form>
              );
            },
          })) || []
        }
      />
    </div>
  );
};
