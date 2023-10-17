import React, { useMemo } from 'react';
import { byString } from 'sort-lib';
import { prop } from 'rambda';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service } from './utils.js';
import { serviceAccessors } from './utils.js';
import ServiceBlock from './ServiceBlock.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import type { ContractDirectory } from '../../../backend/models/contracts.js';

const ChildServices = ({
  parentDirectory,
  currentChildDirectory,
}: {
  parentDirectory: RouterClient['contracts']['getSpecmaticContractsListing'][0]['dirs'][0];
  currentChildDirectory: ContractDirectory[];
}) => {
  return (
    <div>
      <table className="w-full">
        <thead className="bg-theme-page border-t border-theme-seperator shadow-inner px-4">
          <tr>
            <td>Service Name</td>
            <td>API Coverage</td>
            <td>Total Operations</td>
            <td>Stub Usage</td>
          </tr>
        </thead>
        <tbody>
          {currentChildDirectory.map(cd => {
            return (
              <tr key={cd.directoryName}>
                <td>{cd.directoryName}</td>
                <td>
                  {divide(
                    parentDirectory.coverage
                      .filter(x => cd.specIds.includes(x.specId))
                      .reduce((acc, curr) => acc + curr.coveredOperations, 0),
                    parentDirectory.totalOps
                      .filter(x => cd.specIds.includes(x.specId))
                      .reduce((acc, curr) => acc + curr.totalOps, 0)
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
                <td>
                  {parentDirectory.totalOps
                    .filter(x => cd.specIds.includes(x.specId))
                    .reduce((acc, curr) => acc + curr.totalOps, 0)}
                </td>
                <td>
                  {divide(
                    parentDirectory.stubUsage
                      .filter(x => cd.specIds.includes(x.specId))
                      .reduce((acc, curr) => acc + curr.usedOperations, 0),
                    parentDirectory.totalOps
                      .filter(x => cd.specIds.includes(x.specId))
                      .reduce((acc, curr) => acc + curr.totalOps, 0)
                  )
                    .map(toPercentage)
                    .getOr('-')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

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
  dirs: RouterClient['contracts']['getSpecmaticContractsListing'][0]['dirs'];
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
              <details>
                <summary className="p-4 flex justify-between cursor-pointer">
                  <h2 className="text-lg font-semibold">{dir.directoryName}</h2>
                  <div className="flex gap-6">
                    <div>
                      <h2 className="text-lg font-semibold text-right">
                        {divide(
                          dir.coverage.reduce(
                            (acc, curr) => acc + curr.coveredOperations,
                            0
                          ),
                          dir.totalOps.reduce((acc, curr) => acc + curr.totalOps, 0)
                        )
                          .map(toPercentage)
                          .getOr('-')}
                      </h2>
                      <p className="text-gray-600 text-sm font-normal uppercase text-right">
                        API Coverage
                      </p>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-right">
                        {dir.totalOps.reduce((acc, curr) => acc + curr.totalOps, 0)}
                      </h2>
                      <p className="text-gray-600 text-sm font-normal uppercase text-right">
                        Total Operations
                      </p>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-right">
                        {divide(
                          dir.stubUsage.reduce(
                            (acc, curr) => acc + curr.usedOperations,
                            0
                          ),
                          dir.totalOps.reduce((acc, curr) => acc + curr.totalOps, 0)
                        )
                          .map(toPercentage)
                          .getOr('-')}
                      </h2>
                      <p className="text-gray-600 text-sm font-normal uppercase text-right">
                        Stub Usage
                      </p>
                    </div>
                  </div>
                </summary>
                <div>
                  {dir.childDirectories.length > 0 ? (
                    <ChildServices
                      parentDirectory={dir}
                      currentChildDirectory={dir.childDirectories}
                    />
                  ) : null}
                  <div className="bg-theme-page border-t border-theme-seperator shadow-inner px-4">
                    {matchingServices.map(service => (
                      <ServiceBlock
                        key={service.serviceId}
                        service={service}
                        accessors={accessors}
                      />
                    ))}
                  </div>
                </div>
              </details>
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
