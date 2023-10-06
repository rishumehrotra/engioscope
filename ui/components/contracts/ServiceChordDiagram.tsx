import React, { useCallback, useMemo } from 'react';
import { T } from 'rambda';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import ChordDiagram from './ChordDiagram.jsx';
import { minPluralise } from '../../helpers/utils.js';
import { lineColor } from '../OverviewGraphs2/utils.jsx';
import type { Endpoint, Service, ServiceAccessors } from './utils.jsx';
import { serviceAccessors } from './utils.jsx';

const methodBg = (method: string) => {
  if (method === 'GET') return 'bg-blue-400';
  if (method === 'DELETE') return 'bg-red-500';
  if (method === 'PUT') return 'bg-yellow-400';
  return 'bg-green-500';
};

const endpointHtml =
  (isEndpointUsed: ServiceAccessors['isEndpointUsed']) => (endpoint: Endpoint) => {
    return `
    <li class="mb-1">
      <span class="${methodBg(
        endpoint.method
      )} w-12 text-theme-base px-1 rounded inline-block mr-2 text-xs font-bold text-center">
        ${endpoint.method}
      </span>
      ${endpoint.path}
      ${
        isEndpointUsed(endpoint)
          ? ''
          : '<span class="text-theme-base-inverted ml-2 inline-block uppercase text-xs bg-slate-600 rounded px-1 py-0.5">Unused</span>'
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
          ${dependsOn.map(endpointHtml(T)).join('')}
        </ul>
      </div>
    </div>
  `;
};

const whenNonZeroLength = (arr: unknown[], value: string) => (arr.length ? value : '');

const chordTooltip = (accessors: ServiceAccessors) => (service: Service) => {
  const consumers = accessors.consumers(service);
  const providers = accessors.providers(service);

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
          ${consumers.map(serviceNameHtml).join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      service.endpoints,
      `<div class="mt-3">
        <strong>Exposes</strong>
        <ul>
          ${service.endpoints.map(endpointHtml(accessors.isEndpointUsed)).join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      providers,
      `<div class="mt-3">
        <strong>Depends on</strong>
        <ul>
          ${providers.map(serviceNameHtml).join('')}
        </ul>
      </div>`
    )}
    `;
};

const ServiceChordDiagram = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const accessors = useMemo(
    () => serviceAccessors(serviceGraph.data || []),
    [serviceGraph.data]
  );

  const hasConnections = useCallback(
    (service: Service) =>
      accessors.consumers(service).length > 0 || accessors.providers(service).length > 0,
    [accessors]
  );

  return (
    <ChordDiagram
      data={serviceGraph.data || []}
      hasConnections={hasConnections}
      getRelated={accessors.providers}
      lineColor={x => lineColor(x.serviceId)}
      getKey={x => x.serviceId}
      getTitle={x => x.name || 'Unknown'}
      ribbonTooltip={ribbonTooltip}
      ribbonWeight={(from, to) => {
        return from.dependsOn.filter(d => d.serviceId === to.serviceId).length;
      }}
      chordTooltip={chordTooltip(accessors)}
    />
  );
};

export default ServiceChordDiagram;
