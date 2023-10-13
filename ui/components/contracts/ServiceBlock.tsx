import React, { useMemo, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import type { ArcherContainerRef } from 'react-archer';
import { ArcherContainer, ArcherElement } from 'react-archer';
import { XCircle } from 'react-feather';
import type { Service, ServiceAccessors } from './utils.jsx';
import { chunkArray } from '../../../shared/utils.js';
import { minPluralise } from '../../helpers/utils.js';

const itemsPerColumn = 5;

const generateId = () => Math.random().toString(36).slice(2, 11);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const generateIds = <T extends unknown>(items: T[]) => {
  return items.reduce((acc, x) => {
    acc.set(x, generateId());
    return acc;
  }, new Map<T, string>());
};

type ServiceBlockProps = {
  service: Service;
  accessors: ServiceAccessors;
};

const ServiceBlock = ({ service, accessors }: ServiceBlockProps) => {
  const consumers = accessors.consumers(service);
  const providers = accessors.providers(service);
  const archerRef = useRef<ArcherContainerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const consumerIds = useMemo(() => generateIds(consumers), [consumers]);
  const providerIds = useMemo(() => generateIds(providers), [providers]);

  return (
    <div className="overflow-x-scroll overflow-y-hidden w-auto" ref={containerRef}>
      <div className="relative w-max">
        <ArcherContainer
          strokeColor="rgba(202, 138, 4, 0.2)"
          endShape={{ arrow: { arrowLength: 2, arrowThickness: 3 } }}
          ref={archerRef}
        >
          <div className="inline-grid grid-flow-col items-center">
            {/* Container for consumers */}
            {consumers.length ? (
              <div className="flex flex-row items-center">
                {chunkArray(consumers, itemsPerColumn).map((column, columnIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <ul key={columnIndex} className="mr-4 z-10">
                    {column.map(x => (
                      <ArcherElement
                        key={x.serviceId}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        id={consumerIds.get(x)!}
                        relations={[
                          {
                            targetId: service.serviceId,
                            targetAnchor: 'left',
                            sourceAnchor: 'right',
                            style: {
                              strokeWidth: 20,
                            },
                          },
                        ]}
                      >
                        <li
                          data-tooltip-id="react-tooltip"
                          data-tooltip-html={accessors.serviceTooltip(x)}
                          className="border-r-[24px] border-theme-success text-right py-1 px-4 my-3 max-w-xs"
                        >
                          <h3 className="font-medium">{x.name}</h3>
                          <div className="text-theme-helptext text-sm">
                            {x.endpoints.length}{' '}
                            {minPluralise(x.endpoints.length, 'endpoint', 'endpoints')}
                          </div>
                        </li>
                      </ArcherElement>
                    ))}
                  </ul>
                ))}
              </div>
            ) : (
              <div
                className={twMerge(
                  'text-center mr-10 ml-4 relative',
                  'before:border-t before:border-dashed before:border-t-gray-400',
                  'before:content-[""] before:absolute',
                  'before:w-20 before:top-1/2 before:z-0 before:translate-x-7'
                )}
              >
                <XCircle className="inline-block mt-6 text-theme-icon" size={30} />
                <div>No consumers</div>
              </div>
            )}
            <ArcherElement
              id={service.serviceId}
              relations={providers.map(x => ({
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                targetId: providerIds.get(x)!,
                targetAnchor: 'left',
                sourceAnchor: 'right',
                style: {
                  strokeWidth: 20,
                },
              }))}
            >
              <div
                data-tooltip-id="react-tooltip"
                data-tooltip-html={accessors.serviceTooltip(service)}
                className={twMerge(
                  consumers.length > 0 && 'ml-48',
                  providers.length > 0 && 'mr-32',
                  'border border-gray-400 rounded-md px-12 py-3 min-w-fit text-center bg-theme-page-content'
                )}
              >
                <h3 className="font-medium">{service.name}</h3>
                <div className="text-theme-helptext text-sm">
                  {service.endpoints.length}{' '}
                  {minPluralise(service.endpoints.length, 'endpoint', 'endpoints')}
                </div>
              </div>
            </ArcherElement>

            {/* Container for providers */}
            {providers.length ? (
              <div className="flex flex-row items-center">
                {chunkArray(providers, itemsPerColumn).map((column, columnIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <ul key={columnIndex} className="ml-4">
                    {column.map(x => (
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      <ArcherElement key={x.serviceId} id={providerIds.get(x)!}>
                        <li
                          data-tooltip-id="react-tooltip"
                          data-tooltip-html={accessors.serviceTooltip(x)}
                          className="border-l-[24px] border-theme-input-highlight text-left py-1 px-4 my-3 max-w-xs"
                        >
                          <h3 className="font-medium">{x.name}</h3>
                          <div className="text-theme-helptext text-sm">
                            {x.endpoints.length}{' '}
                            {minPluralise(x.endpoints.length, 'endpoint', 'endpoints')}
                          </div>
                        </li>
                      </ArcherElement>
                    ))}
                  </ul>
                ))}
              </div>
            ) : (
              <div
                className={twMerge(
                  'text-center mr-10 pl-4 relative',
                  'before:border-t before:border-dashed before:border-t-gray-400',
                  'before:content-[""] before:absolute',
                  'before:w-12 before:top-1/2 before:z-0 before:-translate-x-12'
                )}
              >
                <XCircle className="inline-block mt-6 text-theme-icon" size={30} />
                <div>No providers</div>
              </div>
            )}
          </div>
        </ArcherContainer>
      </div>
    </div>
  );
};

export default ServiceBlock;
