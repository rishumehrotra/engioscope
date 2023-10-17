import { T, propEq } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';
import { lineColor } from '../OverviewGraphs2/utils.jsx';
import { minPluralise } from '../../helpers/utils.js';

export type Service = RouterClient['contracts']['getServiceGraph'][number];
export type Endpoint = Service['endpoints'][number];

const doesEndpointMatch = (a: Endpoint) => (b: Endpoint) => {
  return (
    a.path === b.path &&
    a.method === b.method &&
    a.specId === b.specId &&
    a.serviceId === b.serviceId
  );
};

const doesServiceIdMatch = (a: Service) => propEq('serviceId', a.serviceId);

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

const connectionTooltip = (source: Service, target: Service) => {
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

const serviceTooltip =
  (accessors: {
    consumers: (x: Service) => Service[];
    providers: (x: Service) => Service[];
    isEndpointUsed: (x: Endpoint) => boolean;
  }) =>
  (service: Service) => {
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

export const serviceAccessors = (services: Service[]) => {
  const providers = (service: Service) => {
    return services.filter(s => service.dependsOn.some(doesServiceIdMatch(s)));
  };
  const consumers = (service: Service) => {
    return services.filter(s =>
      service.endpoints.some(e => s.dependsOn.some(doesEndpointMatch(e)))
    );
  };
  const isEndpointUsed = (endpoint: Endpoint) => {
    return services.some(s => s.dependsOn.some(doesEndpointMatch(endpoint)));
  };
  const consumersOfEndpoint = (endpoint: Endpoint) => {
    return services.filter(s => s.dependsOn.some(doesEndpointMatch(endpoint)));
  };

  return {
    providers,
    consumers,
    consumersOfEndpoint,
    isEndpointUsed,
    connectionTooltip,
    serviceTooltip: serviceTooltip({ providers, consumers, isEndpointUsed }),
  };
};

export type ServiceAccessors = ReturnType<typeof serviceAccessors>;

const generateId = () => Math.random().toString(36).slice(2, 11);

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export const generateIds = <T extends unknown>(items: T[]) => {
  return items.reduce((acc, x) => {
    acc.set(x, generateId());
    return acc;
  }, new Map<T, string>());
};
