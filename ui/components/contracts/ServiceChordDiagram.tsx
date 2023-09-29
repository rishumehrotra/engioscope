import React, { useCallback, useMemo } from 'react';
import { propEq } from 'rambda';
import { trpc, type RouterClient } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import ChordDiagram from './ChordDiagram.jsx';
import { exists } from '../../helpers/utils.js';
import { lineColor } from '../OverviewGraphs2/utils.jsx';

const serviceServesEndpoint =
  ({ path, method, specId }: { path: string; method: string; specId: string }) =>
  (service: RouterClient['contracts']['getServiceGraph'][number]) => {
    return service.endpoints.some(
      e => e.path === path && e.method === method && e.specId === specId
    );
  };

const addServiceIds = (services: RouterClient['contracts']['getServiceGraph']) => {
  return services.map(service => {
    return {
      ...service,
      endpoints: service.endpoints.map(e => ({ ...e, serviceId: service.serviceId })),
      dependsOn: service.dependsOn.map(d => ({
        ...d,
        serviceId: services.find(serviceServesEndpoint(d))?.serviceId || 'unknown',
      })),
    };
  });
};

type ServiceWithIds = ReturnType<typeof addServiceIds>[number];

const ServiceChordDiagram = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const services = useMemo(
    () => addServiceIds(serviceGraph.data || []),
    [serviceGraph.data]
  );

  const getRelated = useCallback(
    (service: ServiceWithIds) => {
      return [...service.dependsOn, ...service.endpoints]
        .map(s => services?.find(propEq('serviceId', s.serviceId)))
        .filter(exists);
    },
    [services]
  );

  const serviceName = useCallback(
    (service?: ServiceWithIds) => {
      if (!service) return 'Unknown';
      const isMonorepo =
        (services || [])?.filter(s => s.repoId === service.repoId).length > 1;

      return isMonorepo ? service.leafDirectory : service.repoName;
    },
    [services]
  );

  return (
    <ChordDiagram
      data={services}
      getRelated={getRelated}
      lineColor={x => lineColor(x.serviceId)}
      getKey={x => x.serviceId}
      ribbonTooltip={(source, target) => {
        if (!source) return 'Unknown';
        return `
          <div>
            Provider: ${serviceName(source)}<br />
            Consumer: ${serviceName(target)}
          </div>
        `;
      }}
      ribbonWeight={(from, to) => {
        return from.dependsOn.filter(d => d.serviceId === to.serviceId).length;
      }}
      chordTooltip={serviceName}
    />
  );
};

export default ServiceChordDiagram;
