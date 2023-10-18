import React, { useMemo } from 'react';
import { byNum, desc } from 'sort-lib';
import { ArcherContainer, ArcherElement } from 'react-archer';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service } from './utils.js';
import { serviceAccessors } from './utils.js';
import { minPluralise } from '../../helpers/utils.js';

type ServiceWithChildren = {
  service: Service;
  children: ServiceWithChildren[];
};

type ServiceAndProvidersProps = {
  service: Service;
  childServices: ServiceWithChildren[];
  accessors: ReturnType<typeof serviceAccessors>;
};

const ServiceAndProviders = ({
  service,
  childServices,
  accessors,
}: ServiceAndProvidersProps) => {
  return (
    <div className="flex items-center">
      <div>
        <ArcherElement
          id={service.serviceId}
          relations={accessors.providers(service).map(s => ({
            targetId: s.serviceId,
            targetAnchor: 'left',
            sourceAnchor: 'right',
            style: {
              strokeWidth: 5,
            },
          }))}
        >
          <div
            className="py-3 px-12 border border-gray-500 rounded-md mr-32 my-4 text-center"
            data-tooltip-id="react-tooltip"
            data-tooltip-html={accessors.serviceTooltip(service)}
          >
            <h3 className="font-medium">{service.name}</h3>
            <div className="text-theme-helptext text-sm">
              {service.endpoints.length}{' '}
              {minPluralise(service.endpoints.length, 'endpoint', 'endpoints')}
            </div>
          </div>
        </ArcherElement>
      </div>
      <div>
        {childServices.map(({ service: provider, children }) => {
          return (
            <ServiceAndProviders
              key={provider.serviceId}
              service={provider}
              childServices={children}
              accessors={accessors}
            />
          );
        })}
      </div>
    </div>
  );
};

const buildGraph = (
  services: Service[],
  accessors: ReturnType<typeof serviceAccessors>
) => {
  const shownServices = new Set<Service>();

  const addChildren = (service: Service): ServiceWithChildren => {
    shownServices.add(service);
    const children = accessors
      .providers(service)
      .filter(x => !shownServices.has(x))
      .map(addChildren);

    return { service, children };
  };

  return services
    .filter(x => accessors.consumers(x).length === 0)
    .sort(desc(byNum(x => accessors.providers(x).length)))
    .map(addChildren);
};

const Architecture = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const accessors = useMemo(
    () => serviceAccessors(serviceGraph.data || []),
    [serviceGraph.data]
  );

  const graph = useMemo(
    () => (serviceGraph.data ? buildGraph(serviceGraph.data, accessors) : null),
    [serviceGraph.data, accessors]
  );

  return (
    <ArcherContainer
      strokeColor="rgba(202, 138, 4, 0.2)"
      endShape={{ arrow: { arrowLength: 2, arrowThickness: 3 } }}
    >
      <ul>
        {graph?.map(({ service, children }) => {
          return (
            <li key={service.serviceId}>
              <ServiceAndProviders
                service={service}
                childServices={children}
                accessors={accessors}
              />
            </li>
          );
        })}
      </ul>
    </ArcherContainer>
  );
};

export default Architecture;
