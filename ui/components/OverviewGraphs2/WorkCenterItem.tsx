import React from 'react';
import { X } from 'react-feather';
import { useDrag, useDrop } from 'react-dnd';
import { twMerge } from 'tailwind-merge';
import type { RouterClient, SingleWorkItemConfig } from '../../helpers/trpc.js';
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx';
import dragHandlePath from './drag-handle.svg';

const dndType = 'workCenterItem';

type SingleWorkCenter = NonNullable<SingleWorkItemConfig['workCenters']>[number];

type WorkCenterItemProps = {
  workCenter: SingleWorkCenter;
  setConfig: (x: (config: SingleWorkCenter) => SingleWorkCenter) => void;
  deleteWorkCenter: () => void;
  states: RouterClient['workItems']['getGroupByFieldAndStatesForWorkType']['states'];
  index: number;
  moveWorkCenterItem: (oldIndex: number, newIndex: number) => void;
};

// React DnD Ref for Simple Sortable Example
// https://codesandbox.io/s/github/react-dnd/react-dnd/tree/gh-pages/examples_ts/04-sortable/simple?from-embed=&file=/src/Card.tsx
const WorkCenterItem = ({
  workCenter,
  states,
  setConfig,
  deleteWorkCenter,
  index,
  moveWorkCenterItem,
}: WorkCenterItemProps) => {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: dndType,
      item: { index },
      collect: monitor => ({ isDragging: monitor.isDragging() }),
    }),
    [index, moveWorkCenterItem]
  );

  const [, drop] = useDrop(
    () => ({
      accept: dndType,
      drop: ({ index: oldIndex }: { index: number }) => {
        if (oldIndex !== index) moveWorkCenterItem(oldIndex, index);
      },
    }),
    [moveWorkCenterItem, index]
  );

  return (
    <div
      ref={node => drop(preview(node))}
      className={twMerge(
        'flex flex-row gap-2 mb-4 cursor-default p-3 border-l-4 border-transparent',
        'hover:shadow-sm hover:bg-theme-secondary hover:border-blue-600',
        isDragging ? 'opacity-50' : 'opacity-100'
      )}
    >
      <div className="text-sm font-medium pt-3 cursor-move" ref={drag}>
        <img src={dragHandlePath} alt="Drag handle" className="w-4 h-4" />
      </div>

      <div className="w-full relative">
        <X
          className="absolute right-0 top-2 cursor-pointer text-theme-icon hover:text-theme-icon-active"
          size={14}
          onClick={deleteWorkCenter}
        />
        <div className="text-sm font-medium pt-3">Label</div>
        <div className="text-sm text-theme-helptext pb-2">Name of the work center.</div>

        <input
          className="w-full"
          type="text"
          placeholder="Enter work center name"
          value={workCenter.label}
          onChange={event => {
            setConfig(x => ({ ...x, label: event.target.value }));
          }}
        />
        <div className="text-sm font-medium pt-3">Start states</div>
        <div className="text-sm text-theme-helptext pb-2">
          Work in this work center starts at these states
        </div>
        <MultiSelectDropdown
          value={workCenter.startStates || []}
          options={(states || []).map(state => ({
            label: state.name,
            value: state.name,
          }))}
          onChange={startStates => {
            setConfig(x => ({ ...x, startStates }));
          }}
        />
        <div className="text-sm font-medium pt-5 pb-1">End states</div>
        <div className="text-sm text-theme-helptext pb-2">
          Work in this work center ends at these states
        </div>
        <MultiSelectDropdown
          value={workCenter.endStates || []}
          options={(states || []).map(state => ({
            label: state.name,
            value: state.name,
          }))}
          onChange={endStates => {
            setConfig(x => ({ ...x, endStates }));
          }}
        />
      </div>
    </div>
  );
};
export default WorkCenterItem;
