import React, { useCallback, useMemo } from 'react';
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

const ServiceChordDiagram = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const services = useMemo(() => {
    return serviceGraph.data?.map(service => {
      return {
        ...service,
        endpoints: service.endpoints.map(e => ({ ...e, serviceId: service.serviceId })),
        dependsOn: service.dependsOn.map(d => ({
          ...d,
          serviceId:
            serviceGraph.data.find(serviceServesEndpoint(d))?.serviceId || 'unknown',
        })),
      };
    });
  }, [serviceGraph.data]);

  type Service = NonNullable<typeof services>[number];

  const getRelated = useCallback(
    (service: Service) => {
      return [...service.dependsOn, ...service.endpoints]
        .map(s => services?.find(x => x.serviceId === s.serviceId))
        .filter(exists);
    },
    [services]
  );

  const serviceName = useCallback(
    (service?: Service) => {
      if (!service) return 'Unknown';
      const isMonorepo =
        (services?.filter(s => s.repoId === service.repoId) || []).length > 1;

      return isMonorepo ? service.leafDirectory : service.repoName;
    },
    [services]
  );

  return (
    <ChordDiagram
      data={services}
      getRelated={getRelated}
      lineColor={x => lineColor(x.serviceId)}
      ribbonTooltip={(source, target) => {
        if (!source) return 'Unknown';
        return `
          <div>
            Provider: ${serviceName(source)}<br />
            Consumer: ${serviceName(target)}
          </div>
        `;
      }}
    />
  );
};

export default ServiceChordDiagram;
