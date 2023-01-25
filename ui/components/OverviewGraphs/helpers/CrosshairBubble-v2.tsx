import React from 'react';
import type { ReactNode } from 'react';
import { contrastColour, shortDate } from '../../../helpers/utils.js';
import type { UIWorkItemType } from '../../../../backend/models/work-item-types.js';

type CrosshairBubbleProps = {
  title: ReactNode;
  date: Date;
  items: {
    workItemType: UIWorkItemType;
    label: string;
    value: string;
    lineColor: string;
  }[];
};

export const CrosshairBubble = ({ title, date, items }: CrosshairBubbleProps) =>
  items.length ? (
    <div className="bg-black bg-opacity-80 text-white text-sm py-3 px-4 rounded-md shadow">
      <h2
        className="font-semibold text-base mb-2 grid grid-cols-2 items-end"
        style={{
          gridTemplateColumns: '2fr 1fr',
        }}
      >
        <div className="text-xl">{title}</div>
        <div className="justify-self-end">{shortDate(date)}</div>
      </h2>
      {items.map(({ workItemType, label, value, lineColor }) => (
        <div key={label}>
          <div className="flex items-center pb-1">
            <img
              className="inline-block mr-1"
              alt={`Icon for ${workItemType.name[1]}`}
              src={workItemType.icon}
              width="16"
            />
            {label}
            <span
              className="rounded-full bg-white bg-opacity-20 text-xs font-semibold px-2 text-white ml-2 inline-block"
              style={{
                backgroundColor: lineColor,
                color: contrastColour(lineColor),
              }}
            >
              {value}
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : null;
