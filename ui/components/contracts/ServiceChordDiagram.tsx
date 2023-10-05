import React, { useCallback, useMemo } from 'react';
import { propEq, uniq } from 'rambda';
import { trpc, type RouterClient } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import ChordDiagram from './ChordDiagram.jsx';
import { exists, minPluralise } from '../../helpers/utils.js';
import { lineColor } from '../OverviewGraphs2/utils.jsx';

type Service = RouterClient['contracts']['getServiceGraph'][number];

const methodBg = (method: string) => {
  if (method === 'GET') return 'bg-blue-400';
  if (method === 'DELETE') return 'bg-red-500';
  if (method === 'PUT') return 'bg-yellow-400';
  return 'bg-green-500';
};

const endpointHtml =
  (unused: boolean) =>
  ({ method, path }: { method: string; path: string }) => {
    return `
    <li class="mb-1">
      <span class="${methodBg(
        method
      )} w-12 text-theme-base px-1 rounded inline-block mr-2 text-xs font-bold text-center">
        ${method}
      </span>
      ${path}
      ${
        unused
          ? '<span class="text-theme-base-inverted ml-2 inline-block uppercase text-xs bg-slate-600 rounded px-1 py-0.5">Unused</span>'
          : ''
      }
    </li>
  `;
  };

const serviceNameHtml = (service: Service) => {
  return `
    <div class="flex items-center gap-2">
      <span class="inline-block w-1 h-4" style="background: ${lineColor(
        service.serviceId
      )}"> </span>
      <span class="font-medium">${service.name}</span>
    </div>
  `;
};

const ribbonTooltip = (source: Service, target: Service) => {
  if (!source) return 'Unknown';
  const dependsOn = target.dependsOn.filter(d => d.serviceId === source.serviceId);

  return `
    <div>
      <div>
        Provider
        ${serviceNameHtml(source)}
      </div>
      <div class="mt-2">
        Consumer
        ${serviceNameHtml(target)}
      </div>
      <div class="mt-2">
        <strong>${minPluralise(dependsOn.length, 'Endpoint', 'Endpoints')} used:</strong>
        <ul>
          ${dependsOn.map(endpointHtml(false)).join('')}
        </ul>
      </div>
    </div>
  `;
};

const whenNonZeroLength = (arr: unknown[], value: string) => (arr.length ? value : '');
const chordTooltip = (services: Service[]) => (service: Service) => {
  const consumers = services.filter(s =>
    s.dependsOn.some(d => d.serviceId === service.serviceId)
  );

  const dependsOn = uniq(
    service.dependsOn
      .map(x => services.find(propEq('serviceId', x.serviceId)))
      .filter(exists)
  );

  return `
    <div class="flex items-center gap-2 text-lg font-medium">
      <span class="inline-block w-2 h-2" style="background: ${lineColor(
        service.serviceId
      )}"> </span>
      ${service.name}
    </div>
    ${whenNonZeroLength(
      consumers,
      `<div class="mt-3">
        <strong>Used by</strong>
        <ul>
          ${consumers.map(c => serviceNameHtml(c)).join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      service.endpoints,
      `<div class="mt-3">
        <strong>Exposes</strong>
        <ul>
          ${service.endpoints
            .map(e =>
              endpointHtml(
                !services.some(s =>
                  s.dependsOn.some(
                    e2 =>
                      e2.path === e.path &&
                      e2.method === e.method &&
                      e2.serviceId === service.serviceId
                  )
                )
              )(e)
            )
            .join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      dependsOn,
      `<div class="mt-3">
        <strong>Depends on</strong>
        <ul>
          ${dependsOn.map(x => serviceNameHtml(x)).join('')}
        </ul>
      </div>`
    )}
    `;
};

const ServiceChordDiagram = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const services = useMemo(() => serviceGraph.data || [], [serviceGraph.data]);

  const getRelated = useCallback(
    (service: Service) => {
      return service.dependsOn
        .map(s => services.find(propEq('serviceId', s.serviceId)))
        .filter(exists);
    },
    [services]
  );

  const hasConnections = useCallback(
    (service: Service) =>
      getRelated(service).length > 0 ||
      services.some(s => s.dependsOn.some(d => d.serviceId === service.serviceId)),
    [getRelated, services]
  );

  return (
    <ChordDiagram
      data={services}
      hasConnections={hasConnections}
      getRelated={getRelated}
      lineColor={x => lineColor(x.serviceId)}
      getKey={x => x.serviceId}
      getTitle={x => x.name || 'Unknown'}
      ribbonTooltip={ribbonTooltip}
      ribbonWeight={(from, to) => {
        return from.dependsOn.filter(d => d.serviceId === to.serviceId).length;
      }}
      chordTooltip={chordTooltip(services)}
    />
  );
};

export default ServiceChordDiagram;
