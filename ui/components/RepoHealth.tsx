/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/interactive-supports-focus */
import React, { useState } from 'react';
import { RepoAnalysis, TopLevelIndicator } from '../../shared-types';
import RepoHealthDetails from './RepoHealthDetails';

const RepoHealth: React.FC<{repo?:RepoAnalysis}> = ({ repo }) => {
  const [selectedIndicator, setSelectedIndicator] = useState<TopLevelIndicator | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  return (repo ? (
    <div className={`bg-white border-l-4 p-6 mb-4 ${isDetailsOpen ? 'border-gray-500' : ''} rounded-lg shadow`}>
      <div className="grid grid-flow-row mt-2">
        <div
          className="w-full cursor-pointer"
          onClick={() => {
            setIsDetailsOpen(!isDetailsOpen);
            setSelectedIndicator(!selectedIndicator ? repo.indicators[0] : selectedIndicator);
          }}
          role="tab"
        >
          <div className="grid mx-6">
            <div>
              <span className="text-lg font-bold inline-block align-text-bottom">{repo.name}</span>
              <span
                className="text-base ml-2 text-gray-600 font-semibold inline-block align-text-bottom"
                style={{ lineHeight: '27px' }}
              >
                {repo.languages ? Object.keys(repo.languages)[0] : ''}
                {' '}
                {repo.languages ? `(${Object.values(repo.languages)[0]})` : ''}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              {
                repo.indicators.map(({
                  name, rating, indicators, count
                }) => (
                  <button
                    style={{ outline: 'none' }}
                    className={`pt-2 pb-4 px-6 mt-2 text-gray-900
                        ${!isDetailsOpen ? 'rounded-lg' : 'rounded-t-lg'}
                        ${selectedIndicator?.name === name ? 'bg-gray-100' : 'hover:bg-gray-100'}
                        hover:text-gray-900 focus:text-gray-900 cursor-pointer`}
                    onClick={(e: React.MouseEvent<HTMLElement>) => {
                      e.stopPropagation();
                      setSelectedIndicator({
                        name, rating, count, indicators
                      });
                      if (!selectedIndicator?.name || selectedIndicator?.name === name || !isDetailsOpen) {
                        setIsDetailsOpen(!isDetailsOpen);
                      }
                    }}
                    key={name}
                    title={!rating ? `${name} is not available` : ''}
                  >
                    {/* <div className={`text-2xl font-semibold text-${getRatingColor(rating)} -mb-1`}>
                          {rating}
                        </div> */}
                    <div>
                      <div className={`text-3xl font-semibold -mb-1 
                          ${selectedIndicator?.name === name ? 'text-black' : 'text-gray-600'} `}
                      >
                        {count}
                      </div>
                      <div className="uppercase text-xs tracking-wider text-gray-600 mt-2">{name}</div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>

        {/* <div className={`bg-${getRatingColor(repo.rating)} text-center flex flex-col items-center w-20 h-20
          justify-center ml-1 p-8 cursor-pointer hover:bg-blue-200 dark-hover:bg-blue-500 rounded-lg`}
        >
          <div className="text-3xl font-bold transition duration-500 ease-in-out text-white p-4 text-center flex">
            {repo.rating}
            <div className="my-auto -mr-2">
              {/* {repo.trend === 1 ? <Up /> : <Down /> } }
            </div>
          </div>
        </div> */}
      </div>
      {isDetailsOpen && selectedIndicator && selectedIndicator.indicators ? (
        <div className="overflow-hidden">
          <RepoHealthDetails indicators={selectedIndicator.indicators} gridCols={selectedIndicator.name === 'Releases' ? 4 : 5} />
        </div>
      ) : null}

    </div>
  ) : null);
};

export default RepoHealth;
