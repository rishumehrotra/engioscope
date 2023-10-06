import { propEq } from 'rambda';
import type { RouterClient } from '../../helpers/trpc.js';

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

export const serviceAccessors = (services: Service[]) => ({
  providers: (service: Service) => {
    return services.filter(s => service.dependsOn.some(doesServiceIdMatch(s)));
  },
  consumers: (service: Service) => {
    return services.filter(s =>
      service.endpoints.some(e => s.dependsOn.some(doesEndpointMatch(e)))
    );
  },
  consumersOfEndpoint: (endpoint: Endpoint) => {
    return services.filter(s => s.dependsOn.some(doesEndpointMatch(endpoint)));
  },
  isEndpointUsed: (endpoint: Endpoint) => {
    return services.some(s => s.dependsOn.some(doesEndpointMatch(endpoint)));
  },
});

export type ServiceAccessors = ReturnType<typeof serviceAccessors>;
