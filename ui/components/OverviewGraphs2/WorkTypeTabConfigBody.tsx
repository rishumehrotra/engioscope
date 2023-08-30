/* eslint-disable no-console */
import React, { useCallback, useEffect, useState } from 'react';
import { prop } from 'rambda';
import { Plus } from 'react-feather';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx';

export type WorkTypeTabConfigBodyProps = {
  config: SingleWorkItemConfig;
};

export const WorkTypeTabConfigBody = ({ config }: WorkTypeTabConfigBodyProps) => {
  const queryContext = useQueryContext();
  const groupByAndStates = trpc.workItems.getGroupByFieldAndStatesForWorkType.useQuery(
    {
      collectionName: queryContext[0],
      project: queryContext[1],
      workItemType: config.name[0],
    },
    { keepPreviousData: true }
  );

  const [configFormData, setConfigFormData] = useState({
    startStates: config.startStates,
    endStates: config.endStates,
    devCompleteStates: config.devCompleteStates,
    groupByField: Object.entries(config.groupByField || {}).map(gf => ({
      name: gf[1],
      referenceName: gf[0],
    })),
    ignoreStates: config.ignoreStates,
    workCenters: config.workCenters,
  });

  useEffect(() => {
    setConfigFormData({
      startStates: config.startStates,
      endStates: config.endStates,
      devCompleteStates: config.devCompleteStates,
      groupByField: Object.entries(config.groupByField || {}).map(gf => ({
        name: gf[0],
        referenceName: gf[1],
      })),
      ignoreStates: config.ignoreStates,
      workCenters: config.workCenters,
    });
  }, [
    config.devCompleteStates,
    config.endStates,
    config.groupByField,
    config.ignoreStates,
    config.startStates,
    config.workCenters,
    groupByAndStates.data,
  ]);

  const onSave: React.FormEventHandler<HTMLFormElement> = useCallback(event => {
    event.preventDefault();
  }, []);

  return (
    <form onSubmit={onSave} className="p-6">
      <div className="text-gray-950 text-sm font-medium pt-3">Start States</div>
      <div className="text-gray-600 text-sm font-normal pb-2">
        Start feature work in this state. This will be reflected on the 'New Work Items'
        graph and the 'Cycle Time' graph.
      </div>
      <MultiSelectDropdown
        value={configFormData.startStates}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={state => {
          setConfigFormData({
            ...configFormData,
            startStates: state,
          });
        }}
      />
      <div className="text-gray-950 text-sm font-medium  pt-5 pb-1">End States</div>
      <div className="text-gray-600 text-sm font-normal pb-2">
        End feature work in this state. This will be reflected on the 'Velocity' graph and
        the 'Cycle Time' graph.
      </div>
      <MultiSelectDropdown
        value={configFormData.endStates}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={state => {
          setConfigFormData({
            ...configFormData,
            endStates: state,
          });
        }}
      />
      <div className="text-gray-950 text-sm font-medium  pt-5 pb-1">
        Dev Completion States
      </div>
      <div className="text-gray-600 text-sm font-normal pb-2">
        Development is completed in this state. This will be reflected on the the 'Cycle
        Time' graph.
      </div>
      <MultiSelectDropdown
        value={configFormData.devCompleteStates || []}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={state => {
          setConfigFormData({
            ...configFormData,
            devCompleteStates: state,
          });
        }}
      />
      <div className="text-gray-950 text-sm font-medium  pt-5 pb-1">Group by Field</div>
      <div className="text-gray-600 text-sm font-normal  pb-2">
        Select the fields for which filtering capabilities are desired
      </div>
      <MultiSelectDropdown
        value={configFormData.groupByField.map(prop('name'))}
        options={(groupByAndStates.data?.fields || []).map(f => ({
          label: f.name,
          value: f.name,
        }))}
        onChange={state => {
          console.log('values', configFormData.groupByField.map(prop('name')));
          console.log('state', state);
          // setConfigFormData({
          //   ...configFormData,
          //   groupByField: state.map(gf => ({
          //     name: gf,
          //     referenceName:
          //       groupByAndStates.data?.fields?.find(f => f.name === gf)
          //         ?.referenceName || '',
          //   })),
          // });
        }}
      />
      <div className="text-gray-950 text-sm font-medium pt-5 pb-1">Ignored States</div>
      <div className="text-gray-600 text-sm font-normal pb-2">
        Work items in this state will not be considered for analysis
      </div>
      <MultiSelectDropdown
        value={configFormData.ignoreStates || []}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={state => {
          setConfigFormData({
            ...configFormData,
            ignoreStates: state,
          });
        }}
      />
      <div className="flex pt-5 pb-1 justify-between">
        <div className="text-gray-950 text-sm font-medium">Work Centers</div>
        <button
          className="flex"
          type="button"
          onClick={() => {
            setConfigFormData({
              ...configFormData,
              workCenters: [
                ...(configFormData.workCenters || []),
                {
                  label: '',
                  startStates: [],
                  endStates: [],
                },
              ],
            });
          }}
        >
          <Plus className="text-theme-highlight" size={20} />
          <span className="font-medium  text-sm text-theme-highlight ml-1">
            Add Work Center
          </span>
        </button>
      </div>
      <div className="text-gray-600 text-sm font-normal">
        Work centers are states where work actually happens. You may define a work center
        by clicking on the link above.
      </div>
      {configFormData.workCenters && configFormData.workCenters.length > 0
        ? configFormData.workCenters.map((workCenter, index) => (
            <div key={workCenter.label}>
              <div className="text-gray-950 text-sm font-bold pt-3">
                Work Center : {index + 1}
              </div>
              <div className="text-gray-950 text-sm font-medium pt-3">Label</div>
              <div className="text-gray-600 text-sm font-normal pb-2">
                Name of the Work Center.
              </div>

              <input
                type="text"
                placeholder="Enter workcenter label"
                value={workCenter.label}
                onChange={event => {
                  setConfigFormData({
                    ...configFormData,
                    workCenters: (configFormData.workCenters || []).map(wc => {
                      if (wc.label === workCenter.label) {
                        return {
                          ...wc,
                          label: event.target.value,
                        };
                      }
                      return wc;
                    }),
                  });
                }}
              />
              <div className="text-gray-950 text-sm font-medium pt-3">Start States</div>
              <div className="text-gray-600 text-sm font-normal pb-2">
                Start feature work in this state. This will be reflected on the 'New Work
                Items' graph and the 'Cycle Time' graph.
              </div>
              <MultiSelectDropdown
                value={workCenter.startStates || []}
                options={(groupByAndStates.data?.states || []).map(state => ({
                  label: state.name,
                  value: state.name,
                }))}
                onChange={state => {
                  setConfigFormData({
                    ...configFormData,
                    workCenters: (configFormData.workCenters || []).map(wc => {
                      if (wc.label === workCenter.label) {
                        return {
                          ...wc,
                          startStates: state,
                        };
                      }
                      return wc;
                    }),
                  });
                }}
              />
              <div className="text-gray-950 text-sm font-medium  pt-5 pb-1">
                End States
              </div>
              <div className="text-gray-600 text-sm font-normal pb-2">
                End feature work in this state. This will be reflected on the 'Velocity'
                graph and the 'Cycle Time' graph.
              </div>
              <MultiSelectDropdown
                value={workCenter.endStates || []}
                options={(groupByAndStates.data?.states || []).map(state => ({
                  label: state.name,
                  value: state.name,
                }))}
                onChange={state => {
                  setConfigFormData({
                    ...configFormData,
                    workCenters: (configFormData.workCenters || []).map(wc => {
                      if (wc.label === workCenter.label) {
                        return {
                          ...wc,
                          endStates: state,
                        };
                      }
                      return wc;
                    }),
                  });
                }}
              />
            </div>
          ))
        : null}
      <div className="text-right px-6 whitespace-nowrap mt-4">
        <button type="submit" className="primary-button">
          Save
        </button>
      </div>
    </form>
  );
};
