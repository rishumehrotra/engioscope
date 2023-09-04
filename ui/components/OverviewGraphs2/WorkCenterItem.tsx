import React, { useRef } from 'react';
import { AlignJustify, X } from 'react-feather';
import type { Identifier, XYCoord } from 'dnd-core';
import { useDrag, useDrop } from 'react-dnd';
import { twMerge } from 'tailwind-merge';
import type { RouterClient, SingleWorkItemConfig } from '../../helpers/trpc.js';
import MultiSelectDropdown from '../common/MultiSelectDropdown.jsx';

const ItemTypes = {
  workCenterItem: 'workCenterItem',
};

type SingleWorkCenter = NonNullable<SingleWorkItemConfig['workCenters']>[number];

type WorkCenterItemProps = {
  workCenter: SingleWorkCenter;
  setConfig: (x: (config: SingleWorkCenter) => SingleWorkCenter) => void;
  deleteWorkCenter: () => void;
  states: RouterClient['workItems']['getGroupByFieldAndStatesForWorkType']['states'];
  id: string;
  index: number;
  moveWorkCenterItem: (dragIndex: number, hoverIndex: number) => void;
};

type DragItem = {
  index: number;
  id: string;
  type: string;
};
// React DnD Ref for Simple Sortable Example
// https://codesandbox.io/s/github/react-dnd/react-dnd/tree/gh-pages/examples_ts/04-sortable/simple?from-embed=&file=/src/Card.tsx
const WorkCenterItem = ({
  workCenter,
  states,
  setConfig,
  deleteWorkCenter,
  id,
  index,
  moveWorkCenterItem,
}: WorkCenterItemProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>(
    {
      accept: ItemTypes.workCenterItem,
      collect: monitor => ({ handlerId: monitor.getHandlerId() }),
      hover: (item, monitor) => {
        if (!dragRef.current) return;

        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = dragRef.current?.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

        moveWorkCenterItem(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    }
  );

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemTypes.workCenterItem,
    item: () => ({ id, index }),
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(dragRef));
  preview(previewRef);
  return (
    <div
      key={workCenter?.label}
      ref={previewRef}
      // data-handler-id={handlerId}
      className={twMerge(
        'flex flex-row gap-2 mb-4 cursor-default p-3 border-l-4 border-transparent',
        'hover:shadow-sm hover:bg-theme-secondary hover:border-blue-600',
        isDragging ? 'opacity-10' : 'opacity-100'
      )}
    >
      <div
        className="text-sm font-medium pt-3 cursor-move"
        ref={dragRef}
        data-handler-id={handlerId}
      >
        <AlignJustify size={20} />
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
          value={workCenter?.label}
          onChange={event => {
            setConfig(x => ({ ...x, label: event.target.value }));
          }}
        />
        <div className="text-sm font-medium pt-3">Start states</div>
        <div className="text-sm text-theme-helptext pb-2">
          Work in this work center starts at these states
        </div>
        <MultiSelectDropdown
          value={workCenter?.startStates || []}
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
          value={workCenter?.endStates || []}
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
