/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/interactive-supports-focus */
import React from 'react';

type CardTitleProps = {
  title: string;
  titleUrl?: string;
  subtitle: React.ReactNode | undefined;
}

const CardTitle: React.FC<CardTitleProps> = ({ title, subtitle, titleUrl }) => (
  <div>
    <span className="text-lg font-bold inline-block align-text-bottom">
      {titleUrl ? (
        <a
          href={titleUrl}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
        >
          {title}
        </a>
      ) : title}
    </span>
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
  titleUrl?: string;
  subtitle?: React.ReactNode | undefined;
  // TODO: Remove this prop
  preTabs?: React.ReactNode;
  tag?: string;
  onCardClick?: () => void;
  isExpanded: boolean;
}

const Card: React.FC<CardProps> = ({
  title, titleUrl, subtitle, tag, children, onCardClick, isExpanded
}) => (
  <div className={`bg-white border-l-4 p-6 mb-4 ${isExpanded ? 'border-gray-500' : ''} 
  transition-colors duration-500 ease-in-out rounded-lg shadow relative`}
  >
    <div className="grid grid-flow-row mt-2">
      <div
        className="w-full cursor-pointer"
        role="button"
        onClick={onCardClick}
      >
        {tag && (
          <div
            className="absolute right-0 top-0 bg-gray-400 text-white px-3 py-1 text-sm uppercase my-3 rounded-l-md"
          >
            {tag}
          </div>
        )}
        <div className="grid mx-6">
          <CardTitle
            title={title}
            titleUrl={titleUrl}
            subtitle={subtitle}
          />
        </div>
      </div>
    </div>
    {children}
  </div>
);

export default Card;
