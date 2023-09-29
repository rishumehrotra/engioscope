import React, { useCallback, useMemo } from 'react';
import { propEq, uniq } from 'rambda';
import { trpc, type RouterClient } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import ChordDiagram from './ChordDiagram.jsx';
import { exists, minPluralise } from '../../helpers/utils.js';
import { lineColor } from '../OverviewGraphs2/utils.jsx';

type Service = RouterClient['contracts']['getServiceGraph'][number];

const endpointHtml = ({ method, path }: { method: string; path: string }) => {
  return `
    <li class="mb-1">
      <span class="bg-orange-500 text-theme-base px-1 rounded inline-block mr-2 text-xs font-bold">
        ${method}
      </span>
      ${path}
    </li>
  `;
};

const serviceNameHtml = (service: Service, tag?: string) => {
  return `
    <div class="flex items-center gap-2">
      <span class="inline-block w-2 h-2 rounded-full" style="background: ${lineColor(
        service.serviceId
      )}"> </span>
      ${service.name}
      ${tag ? `<span class="ml-2 text-sm text-theme-icon">${tag}</span>` : ''}
    </div>
  `;
};

const ribbonTooltip = (source: Service, target: Service) => {
  if (!source) return 'Unknown';
  const dependsOn = target.dependsOn.filter(d => d.serviceId === source.serviceId);

  return `
    <div>
      ${serviceNameHtml(source, 'Provider')}
      ${serviceNameHtml(target, 'Consumer')}
      <div class="mt-1">
        <strong>${minPluralise(dependsOn.length, 'Endpoint', 'Endpoints')} used:</strong>
        <ul>
          ${dependsOn.map(endpointHtml).join('')}
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
    ${serviceNameHtml(service)}
    ${whenNonZeroLength(
      consumers,
      `<div class="mt-2">
        <strong>Used by</strong>
        <ul>
          ${consumers.map(c => serviceNameHtml(c)).join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      service.endpoints,
      `<div class="mt-1">
        <strong>Exposes</strong>
        <ul>
          ${service.endpoints.map(endpointHtml).join('')}
        </ul>
      </div>`
    )}
    ${whenNonZeroLength(
      dependsOn,
      `<div class="mt-1">
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

  return (
    <ChordDiagram
      data={services}
      getRelated={getRelated}
      lineColor={x => lineColor(x.serviceId)}
      getKey={x => x.serviceId}
      ribbonTooltip={ribbonTooltip}
      ribbonWeight={(from, to) => {
        return from.dependsOn.filter(d => d.serviceId === to.serviceId).length;
      }}
      chordTooltip={chordTooltip(services)}
    />
  );
};

export default ServiceChordDiagram;
