/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/interactive-supports-focus */
import React, { useState } from 'react';
import { num } from '../helpers';

type TopLevelTabProps = {
  isSelected: boolean;
  label: string;
  count: string | number;
  onToggleSelect: () => void;
}

const TopLevelTab: React.FC<TopLevelTabProps> = ({
  isSelected, onToggleSelect, count, label
}) => (
  <button
    style={{ outline: 'none' }}
    className={`pt-2 pb-4 px-6 mt-2 text-gray-900 break-words
        ${isSelected ? 'rounded-t-lg' : 'rounded-lg'}
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'}
        hover:text-gray-900 focus:text-gray-900 cursor-pointer`}
    onClick={e => {
      e.stopPropagation();
      onToggleSelect();
    }}
  >
    <div>
      <div className={`text-3xl font-semibold -mb-1 ${isSelected ? 'text-black' : 'text-gray-600'} `}>
        {typeof count === 'number' ? num(count) : count}
      </div>
      <div className="uppercase text-xs tracking-wider text-gray-600 mt-2">{label}</div>
    </div>
  </button>
);

type CardTitleProps = {
  title: string;
  subtitle: string | undefined;
}

const CardTitle: React.FC<CardTitleProps> = ({ title, subtitle }) => (
  <div>
    <span className="text-lg font-bold inline-block align-text-bottom">{title}</span>
    <span
      className="text-base ml-2 text-gray-600 font-semibold inline-block align-text-bottom"
      style={{ lineHeight: '27px' }}
    >
      {subtitle}
    </span>
  </div>
);

export type CardProps = {
  title: string;
  subtitle?: string | undefined;
  tabs: {
    title: string;
    count: number | string;
    content: React.ReactNode;
  }[];
}

const Card: React.FC<CardProps> = ({
  title, subtitle, tabs
}) => {
  const [selectedTab, setSelectedTab] = useState<CardProps['tabs'][number] | null>(null);

  return (
    <div className={`bg-white border-l-4 p-6 mb-4 ${selectedTab ? 'border-gray-500' : ''} rounded-lg shadow`}>
      <div className="grid grid-flow-row mt-2">
        <div
          className="w-full cursor-pointer"
          role="tab"
          onClick={() => {
            setSelectedTab(!selectedTab ? tabs[0] : null);
          }}
        >
          <div className="grid mx-6">
            <CardTitle
              title={title}
              subtitle={subtitle}
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {
                tabs.map(tab => (
                  <TopLevelTab
                    key={tab.title}
                    count={tab.count}
                    label={tab.title}
                    isSelected={selectedTab === tab}
                    onToggleSelect={() => setSelectedTab(selectedTab === tab ? null : tab)}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </div>
      {selectedTab ? selectedTab.content : null}
    </div>
  );
};

export default Card;
