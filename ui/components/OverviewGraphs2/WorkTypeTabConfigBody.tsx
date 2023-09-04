import React from 'react';
import { Plus } from 'react-feather';
import { head } from 'rambda';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx';
import { isBugLike } from '../../../shared/work-item-utils.js';
import WorkCenterItem from './WorkCenterItem.jsx';

export type WorkTypeTabConfigBodyProps = {
  config: SingleWorkItemConfig;
  setConfig: (x: (config: SingleWorkItemConfig) => SingleWorkItemConfig) => void;
};

export const WorkTypeTabConfigBody = ({
  config,
  setConfig,
}: WorkTypeTabConfigBodyProps) => {
  const queryContext = useQueryContext();
  const groupByAndStates = trpc.workItems.getGroupByFieldAndStatesForWorkType.useQuery(
    {
      collectionName: queryContext[0],
      project: queryContext[1],
      workItemType: config?.name[0] || '', // Empty string condition is to keep TS happy
    },
    { keepPreviousData: true, enabled: Boolean(config) }
  );

  return (
    <div className="p-6">
      <div className="text-sm font-medium pt-3">Start states</div>
      <div className="text-sm text-theme-helptext pb-2">
        Work on a {config.name[0].toLocaleLowerCase()} starts when it enters one of these
        states. This is used in most graphs, like the 'New work items' graph and the
        'Cycle time' graph.
      </div>
      <MultiSelectDropdown
        value={config.startStates}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={startStates => {
          setConfig(x => ({ ...x, startStates }));
        }}
      />
      <div className="text-sm font-medium pt-5 pb-1">End states</div>
      <div className="text-sm text-theme-helptext pb-2">
        Work on a {config.name[0].toLocaleLowerCase()} ends when it enters one of these
        states. This is used in many graphs, like the 'Velocity' graph and the 'Cycle
        time' graph.
      </div>
      <MultiSelectDropdown
        value={config.endStates}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={endStates => {
          setConfig(x => ({ ...x, endStates }));
        }}
      />
      <div className=" text-sm font-medium pt-5 pb-1">Dev completion states</div>
      <div className="text-sm text-theme-helptext pb-2">
        Development is completed in this state. This is used on the the 'Change lead time'
        graph.
      </div>
      <MultiSelectDropdown
        value={config.devCompleteStates || []}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={devCompleteStates => {
          setConfig(x => ({ ...x, devCompleteStates }));
        }}
      />
      <div className="text-sm font-medium pt-5 pb-1">
        {isBugLike(config.name[0]) ? 'Found in environment' : `${config.name[0]} type`}
      </div>
      <div className="text-sm text-theme-helptext pb-2">
        {isBugLike(config.name[0])
          ? "The field which specifies the bug's environment."
          : `The field by which ${config.name[1].toLocaleLowerCase()} are categorized.`}
        {` This lets you filter ${config.name[1].toLocaleLowerCase()} on all graphs.`}
      </div>
      <MultiSelectDropdown
        value={Object.keys(config.groupByField || {})}
        options={(groupByAndStates.data?.fields || []).map(f => ({
          label: f.name,
          value: f.referenceName,
        }))}
        onChange={referenceNames => {
          setConfig(x => {
            const oldGroupBy = head(Object.keys(x.groupByField || {}));
            const remainingGroupBy = referenceNames.find(x => x !== oldGroupBy);

            return {
              ...x,
              groupByField: remainingGroupBy
                ? {
                    [remainingGroupBy]:
                      groupByAndStates.data?.fields?.find(
                        f => f.referenceName === remainingGroupBy
                      )?.name || '',
                  }
                : undefined,
            };
          });
        }}
      />
      {isBugLike(config.name[0]) ? (
        <>
          <div className="text-sm font-medium pt-5 pb-1">Root cause</div>
          <div className="text-sm text-theme-helptext pb-2">
            {`The field that records the root cause for 
            ${config.name[1].toLocaleLowerCase()}. This is used in the 'Bug leakage' graph.`}
          </div>
          <MultiSelectDropdown
            value={Object.keys(config.rootCause || {})}
            options={(groupByAndStates.data?.fields || []).map(f => ({
              label: f.name,
              value: f.referenceName,
            }))}
            onChange={referenceNames => {
              setConfig(x => {
                return {
                  ...x,
                  rootCause: referenceNames.reduce(
                    (acc, curr) => ({
                      ...acc,
                      [curr]: config.rootCause?.[curr] || [],
                    }),
                    {}
                  ),
                };
              });
            }}
          />
        </>
      ) : null}
      <div className="text-sm font-medium pt-5 pb-1">Ignored states</div>
      <div className="text-sm text-theme-helptext pb-2">
        {config.name[1]} in this state will not be considered for analysis.
      </div>
      <MultiSelectDropdown
        value={config.ignoreStates || []}
        options={(groupByAndStates.data?.states || []).map(state => ({
          label: state.name,
          value: state.name,
        }))}
        onChange={ignoreStates => {
          setConfig(x => ({ ...x, ignoreStates }));
        }}
      />
      <div className="flex pt-5 pb-1 justify-between">
        <div className="text-sm font-medium">Work centers</div>
        <button
          className="flex"
          type="button"
          onClick={() => {
            setConfig(x => ({
              ...x,
              workCenters: [
                ...(x.workCenters || []),
                {
                  label: `Work center ${x.workCenters?.length || 0 + 1}`,
                  startStates: [],
                  endStates: [],
                },
              ],
            }));
          }}
        >
          <Plus className="text-theme-highlight" size={20} />
          <span className="font-medium text-sm text-theme-highlight ml-1">
            Add work center
          </span>
        </button>
      </div>
      <div className="text-sm text-theme-helptext">
        Work centers are states where work actually happens. This is used for the 'Flow
        efficiency' graph. You may define a work center by clicking on the link above.
      </div>
      <DndProvider backend={HTML5Backend}>
        {config.workCenters?.map((workCenter, workCenterIndex) => (
          <WorkCenterItem
            // eslint-disable-next-line react/no-array-index-key
            key={workCenterIndex}
            workCenter={workCenter}
            states={groupByAndStates.data?.states || []}
            setConfig={setter => {
              setConfig(x => {
                return {
                  ...x,
                  workCenters: x.workCenters?.map((wc, i) =>
                    i === workCenterIndex ? setter(wc) : wc
                  ),
                };
              });
            }}
            deleteWorkCenter={() => {
              setConfig(x => {
                return {
                  ...x,
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  workCenters: [...x.workCenters!].splice(workCenterIndex, 1),
                };
              });
            }}
            id={workCenter.label}
            index={workCenterIndex}
            moveWorkCenterItem={(dragIndex, hoverIndex) => {
              setConfig(x => {
                const workCenters = [...(x.workCenters || [])];
                const dragCard = workCenters[dragIndex];
                workCenters.splice(dragIndex, 1);
                workCenters.splice(hoverIndex, 0, dragCard);
                return { ...x, workCenters };
              });
            }}
          />
        ))}
      </DndProvider>
    </div>
  );
};
