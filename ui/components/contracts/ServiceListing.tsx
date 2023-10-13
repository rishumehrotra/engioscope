import React, { useMemo } from 'react';
import { byString } from 'sort-lib';
import { prop } from 'rambda';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service } from './utils.jsx';
import { serviceAccessors } from './utils.jsx';
import ServiceBlock from './ServiceBlock.jsx';
import type { ContractDirectory } from '../../../backend/models/contracts.js';

const ServiceListingUsingServiceGraph = ({
  services,
  accessors,
}: {
  services: Service[];
  accessors: ReturnType<typeof serviceAccessors>;
}) => {
  return (
    <ul>
      {services.map(service => (
        <li key={service.serviceId} className="py-6">
          <h2 className="text-lg font-semibold">{service.name}</h2>
          <ServiceBlock service={service} accessors={accessors} />
        </li>
      ))}
    </ul>
  );
};

const ServiceListingUsingCentralRepoListingForOneRepo = ({
  services,
  accessors,
  // repoUrl,
  dirs,
}: {
  services: Service[];
  accessors: ReturnType<typeof serviceAccessors>;
  // repoUrl: string;
  dirs: ContractDirectory[];
}) => {
  const dirsAndhServices = useMemo(
    () =>
      dirs.map(dir => {
        const matchingServices = services.filter(service =>
          service.endpoints.some(endpoint => dir.specIds.includes(endpoint.specId))
        );

        return {
          ...dir,
          services: matchingServices,
        };
      }),
    [dirs, services]
  );

  const dirsHavingServices = useMemo(
    () => dirsAndhServices.filter(dir => dir.services.length > 0),
    [dirsAndhServices]
  );

  const dirsNotHavingServices = useMemo(
    () => dirsAndhServices.filter(dir => dir.services.length === 0),
    [dirsAndhServices]
  );

  return (
    <>
      {dirsNotHavingServices.length > 0 && (
        <details className="mb-4">
          <summary className=""> Spec directories without any services</summary>
          <ul>
            {dirsNotHavingServices.map(dir => (
              <li
                key={dir.directoryName}
                className="inline-block px-2 py-1 border border-theme-seperator m-1 rounded"
              >
                {dir.directoryName}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ul>
        {dirsHavingServices.sort(byString(prop('directoryName'))).map(dir => {
          const matchingServices = services.filter(service =>
            service.endpoints.some(endpoint => dir.specIds.includes(endpoint.specId))
          );

          return (
            <li
              key={dir.directoryName}
              className="border border-theme-seperator rounded-md bg-theme-page-content mb-4"
            >
              <div className="p-4 flex">
                <h2 className="text-lg font-semibold">{dir.directoryName}</h2>
              </div>
              <div className="bg-theme-page border-t border-theme-seperator shadow-inner px-4">
                {matchingServices.map(service => (
                  <ServiceBlock
                    key={service.serviceId}
                    service={service}
                    accessors={accessors}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};

const ServiceListingUsingCentralRepoListing = ({
  services,
  accessors,
  repoTree,
}: {
  services: Service[];
  repoTree: RouterClient['contracts']['getSpecmaticContractsListing'];
  accessors: ReturnType<typeof serviceAccessors>;
}) => {
  return repoTree.map(({ repoUrl, dirs }) => (
    <ServiceListingUsingCentralRepoListingForOneRepo
      key={repoUrl}
      services={services}
      accessors={accessors}
      dirs={dirs}
    />
  ));
};

const ServiceListing = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);
  const centralRepoListing =
    trpc.contracts.getSpecmaticContractsListing.useQuery(queryContext);

  const accessors = useMemo(
    () => serviceAccessors(serviceGraph.data || []),
    [serviceGraph.data]
  );

  if ((centralRepoListing.data || []).length === 0) {
    return (
      <ServiceListingUsingServiceGraph
        services={serviceGraph.data || []}
        accessors={accessors}
      />
    );
  }

  return (
    <ServiceListingUsingCentralRepoListing
      services={serviceGraph.data || []}
      accessors={accessors}
      repoTree={centralRepoListing.data || []}
    />
  );
};

export default ServiceListing;
