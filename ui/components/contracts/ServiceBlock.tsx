import React, { useMemo } from 'react';
import { useQueryContext } from '../../hooks/query-hooks.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service, ServiceAccessors } from './utils.jsx';
import { serviceAccessors } from './utils.jsx';

type ServiceBlockProps = {
  service: Service;
  accessors: ServiceAccessors;
};

const ServiceBlock = ({ service, accessors }: ServiceBlockProps) => {
  return (
    <div>
      <div className="flex ml-5">
        <ul className="border border-gray-300">
          {accessors.consumers(service).map(x => (
            <li
              key={x.serviceId}
              data-tooltip-id="react-tooltip"
              data-tooltip-html={accessors.serviceTooltip(x)}
            >
              {x.name}
            </li>
          ))}
        </ul>
        <div
          data-tooltip-id="react-tooltip"
          data-tooltip-html={accessors.serviceTooltip(service)}
        >
          {service.name}
        </div>
        <ul>
          {accessors.providers(service).map(x => (
            <li
              key={x.serviceId}
              data-tooltip-id="react-tooltip"
              data-tooltip-html={accessors.serviceTooltip(x)}
            >
              {x.name}
            </li>
          ))}
        </ul>
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
        <ServiceBlock key={service.serviceId} service={service} accessors={accessors} />
      ))}
    </ul>
  );
};
