import React, { useMemo, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import type { ArcherContainerRef } from 'react-archer';
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service, ServiceAccessors } from './utils.jsx';
import { serviceAccessors } from './utils.jsx';
import { chunkArray } from '../../../shared/utils.js';
import { minPluralise } from '../../helpers/utils.js';

const itemsPerColumn = 5;

const generateId = () => Math.random().toString(36).slice(2, 11);

type ServiceBlockProps = {
  service: Service;
  accessors: ServiceAccessors;
};

const ServiceBlock = ({ service, accessors }: ServiceBlockProps) => {
  const consumers = accessors.consumers(service);
  const providers = accessors.providers(service);
  const archerRef = useRef<ArcherContainerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const consumerIds = useMemo(() => {
    return consumers.reduce((acc, x) => {
      acc.set(x, generateId());
      return acc;
    }, new Map<Service, string>());
  }, [consumers]);

  const providerIds = useMemo(() => {
    return providers.reduce((acc, x) => {
      acc.set(x, generateId());
      return acc;
    }, new Map<Service, string>());
  }, [providers]);

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
            ) : null}
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
                  'border border-theme-input rounded-md px-12 py-3 min-w-fit text-center'
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
            ) : null}
          </div>
        </ArcherContainer>
      </div>
    </div>
  );
};

export default () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const accessors = useMemo(
    () => serviceAccessors(serviceGraph.data || []),
    [serviceGraph.data]
  );

  return (
    <ul>
      {serviceGraph.data?.map(service => (
        <li key={service.serviceId} className="py-6">
          <h2 className="text-lg font-semibold">{service.name}</h2>
          <ServiceBlock service={service} accessors={accessors} />
        </li>
      ))}
    </ul>
  );
};
