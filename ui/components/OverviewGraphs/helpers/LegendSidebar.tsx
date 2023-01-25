import type { ReactNode } from 'react';
import React from 'react';

export const sidebarWidth = '310px';

export type LegendSidebarProps = {
  headlineStats: {
    label: string;
    value: string;
    unit: string;
  }[];
  items: {
    iconUrl?: string;
    label: string;
    value: ReactNode;
    key: string;
    color: string;
    isChecked?: boolean;
  }[];
  onItemClick: (key: string) => void;
  onCheckboxClick?: (key: string, isChecked: boolean) => void;
};

export const LegendSidebar: React.FC<LegendSidebarProps> = ({
  headlineStats,
  items,
  onItemClick,
  onCheckboxClick,
}) => (
  <div style={{ width: sidebarWidth }} className="justify-self-end">
    {headlineStats.length > 0 && (
      <div className="bg-gray-800 text-white p-4 mb-2 rounded-t-lg grid grid-cols-2 gap-4">
        {headlineStats.map(({ label, value, unit }) => (
          <div key={label}>
            <h3 className="font-semibold pb-1">{label}</h3>
            <div className="">
              <span className="text-2xl font-semibold">{value}</span>{' '}
              <span className="text-sm">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    )}
    <div className="grid gap-3 grid-cols-2">
      {items.map(({ iconUrl, label, value, key, color, isChecked }) => (
        <div className="relative" key={key}>
          {onCheckboxClick && (
            <input
              type="checkbox"
              className="absolute right-2 top-2 opacity-70"
              checked={isChecked}
              onChange={e => {
                onCheckboxClick(key, e.target.checked);
                e.stopPropagation();
              }}
            />
          )}

          <button
            className="p-2 shadow rounded-md block text-left w-full"
            style={{ borderLeft: `5px solid ${color}` }}
            onClick={() => onItemClick(key)}
          >
            <h4
              className={`text-sm flex items-center h-10 overflow-hidden ${
                iconUrl ? 'px-5' : ''
              } ${onCheckboxClick ? 'pr-2' : ''}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textIndent: iconUrl ? '-20px' : '0',
              }}
            >
              {iconUrl && (
                <img
                  className="inline-block mr-1"
                  alt={`Icon for ${label}`}
                  src={iconUrl}
                  width="16"
                />
              )}
              {label}
            </h4>
            <div
              className={`text-xl flex items-center font-semibold ${
                iconUrl ? 'pl-5' : ''
              }`}
            >
              {value}
            </div>
          </button>
        </div>
      ))}
    </div>
  </div>
);
