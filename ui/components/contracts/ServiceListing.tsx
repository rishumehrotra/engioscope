import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { byString } from 'sort-lib';
import { prop, sum } from 'rambda';
import { Minus, Plus } from 'react-feather';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service } from './utils.js';
import { serviceAccessors } from './utils.js';
import ServiceBlock from './ServiceBlock.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import AnimateHeight from '../common/AnimateHeight.jsx';
import type { ContractDirectory } from '../../../backend/models/contracts.js';

type ContractDirectoryWithServices = Omit<ContractDirectory, 'childDirectories'> & {
  childDirectories: ContractDirectoryWithServices[];
  services: Service[];
};

const aggregateCoverage = (coverage: ContractDirectory['coverage']) => {
  return sum(coverage.map(prop('coveredOperations')));
};

const aggregateTotalOps = (totalOps: ContractDirectory['totalOps']) => {
  return sum(totalOps.map(prop('totalOps')));
};

const aggregateStubUsage = (stubUsage: ContractDirectory['stubUsage']) => {
  return sum(stubUsage.map(prop('usedOperations')));
};

const ChildDirectories = ({
  services,
  directory,
  indentLevel,
  accessors,
}: {
  directory: ContractDirectoryWithServices;
  services: Service[];
  accessors: ReturnType<typeof serviceAccessors>;
  indentLevel: number;
}) => {
  const [expandedDirectories, setExpandedDirectories] = useState<
    Record<string, 'open' | 'closing' | 'closed'>
  >(
    directory.childDirectories.reduce(
      (acc, dir) => ({ ...acc, [dir.directoryName]: 'closed' }),
      {}
    )
  );

  const onCollapsedDirectory = useCallback(
    (directoryName: string) => {
      return () => {
        setExpandedDirectories({ ...expandedDirectories, [directoryName]: 'closed' });
      };
    },
    [expandedDirectories]
  );

  const toggleExpand = useCallback(
    (directoryName: string) => {
      return () => {
        setExpandedDirectories({
          ...expandedDirectories,
          [directoryName]:
            expandedDirectories[directoryName] === 'open' ? 'closing' : 'open',
        });
      };
    },
    [expandedDirectories]
  );

  return (
    <>
      {directory.childDirectories.map(dir => (
        <Fragment key={dir.directoryName}>
          <tr
            onClick={toggleExpand(dir.directoryName)}
            className="cursor-pointer border-b border-theme-seperator"
          >
            <td className="pl-6 py-2">
              <span className="inline-block" style={{ paddingLeft: `${indentLevel}rem` }}>
                {expandedDirectories[dir.directoryName] === 'open' ? (
                  <Minus className="inline-block mr-2" size={16} />
                ) : (
                  <Plus className="inline-block mr-2" size={16} />
                )}
                {dir.directoryName}
              </span>
            </td>
            <td className="py-2">
              {divide(
                aggregateCoverage(
                  directory.coverage.filter(x => dir.specIds.includes(x.specId))
                ),
                aggregateTotalOps(
                  directory.totalOps.filter(x => dir.specIds.includes(x.specId))
                )
              )
                .map(toPercentage)
                .getOr('-')}
            </td>
            <td className="py-2">
              {aggregateTotalOps(
                directory.totalOps.filter(x => dir.specIds.includes(x.specId))
              )}
            </td>
            <td className="py-2">
              {divide(
                aggregateStubUsage(
                  directory.stubUsage.filter(x => dir.specIds.includes(x.specId))
                ),
                aggregateTotalOps(
                  directory.totalOps.filter(x => dir.specIds.includes(x.specId))
                )
              )
                .map(toPercentage)
                .getOr('-')}
            </td>
          </tr>
          {expandedDirectories[dir.directoryName] === 'closed' ? null : (
            <tr>
              <td>
                <AnimateHeight
                  collapse={expandedDirectories[dir.directoryName] === 'closing'}
                  onCollapsed={onCollapsedDirectory(dir.directoryName)}
                >
                  <ChildDirectories
                    directory={dir}
                    indentLevel={indentLevel + 1}
                    accessors={accessors}
                    services={services}
                  />
                  {dir.services.map(service => (
                    <ServiceBlock
                      key={service.serviceId}
                      service={service}
                      accessors={accessors}
                    />
                  ))}
                </AnimateHeight>
              </td>
            </tr>
          )}
        </Fragment>
      ))}
    </>
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

const addServicesToDirectories = (
  dirs: ContractDirectory[],
  services: Service[]
): ContractDirectoryWithServices[] => {
  return dirs.map(dir => {
    const matchingServices = services.filter(service =>
      service.endpoints.some(endpoint => dir.specIds.includes(endpoint.specId))
    );

    return {
      ...dir,
      childDirectories: addServicesToDirectories(dir.childDirectories, services),
      services: matchingServices,
    };
  });
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
    () => addServicesToDirectories(dirs, services),
    // dirs.map(dir => {
    //   const matchingServices = services.filter(service =>
    //     service.endpoints.some(endpoint => dir.specIds.includes(endpoint.specId))
    //   );

    //   return {
    //     ...dir,
    //     services: matchingServices,
    //   };
    // }),
    [dirs, services]
  );

  const dirsHavingServices = useMemo(
    () =>
      dirsAndhServices
        .filter(dir => dir.services.length > 0)
        .sort(byString(prop('directoryName'))),
    [dirsAndhServices]
  );

  const dirsNotHavingServices = useMemo(
    () =>
      dirsAndhServices
        .filter(dir => dir.services.length === 0)
        .sort(byString(prop('directoryName'))),
    [dirsAndhServices]
  );

  const [expandedDirectories, setExpandedDirectories] = useState<
    Record<string, 'open' | 'closing' | 'closed'>
  >(
    dirsHavingServices.reduce(
      (acc, dir) => ({ ...acc, [dir.directoryName]: 'closed' }),
      {}
    )
  );

  const onCollapsedDirectory = useCallback(
    (directoryName: string) => {
      return () => {
        setExpandedDirectories({ ...expandedDirectories, [directoryName]: 'closed' });
      };
    },
    [expandedDirectories]
  );

  const toggleExpand = useCallback(
    (directoryName: string) => {
      return () => {
        setExpandedDirectories({
          ...expandedDirectories,
          [directoryName]:
            expandedDirectories[directoryName] === 'open' ? 'closing' : 'open',
        });
      };
    },
    [expandedDirectories]
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
        {dirsHavingServices.map(dir => (
          <li
            key={dir.directoryName}
            className="border border-theme-seperator rounded-md mb-4"
          >
            <button
              onClick={toggleExpand(dir.directoryName)}
              className="bg-theme-page-content w-full"
            >
              <div className="px-6 py-3 flex justify-between cursor-pointer items-center">
                <h2 className="text-lg font-semibold">{dir.directoryName}</h2>
                <div className="flex gap-6">
                  <div>
                    <h2 className="text-lg font-semibold text-right">
                      {divide(
                        aggregateCoverage(dir.coverage),
                        aggregateTotalOps(dir.totalOps)
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
                      {aggregateTotalOps(dir.totalOps)}
                    </h2>
                    <p className="text-gray-600 text-sm font-normal uppercase text-right">
                      Total Operations
                    </p>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-right">
                      {divide(
                        aggregateStubUsage(dir.stubUsage),
                        aggregateTotalOps(dir.totalOps)
                      )
                        .map(toPercentage)
                        .getOr('-')}
                    </h2>
                    <p className="text-gray-600 text-sm font-normal uppercase text-right">
                      Stub Usage
                    </p>
                  </div>
                </div>
              </div>
            </button>
            {expandedDirectories[dir.directoryName] === 'closed' ? null : (
              <AnimateHeight
                collapse={expandedDirectories[dir.directoryName] === 'closing'}
                onCollapsed={onCollapsedDirectory(dir.directoryName)}
              >
                {dir.childDirectories.length > 0 ? (
                  <table className="w-full bg-theme-page-content">
                    <thead className="bg-theme-page border-t border-theme-seperator px-4">
                      <tr className="uppercase border-b border-theme-seperator text-xs">
                        <th className="font-normal px-6 sr-only">Directory</th>
                        <th className="w-[7.5rem] py-2 font-normal">API Coverage</th>
                        <th className="w-40 py-2 font-normal">Total Operations</th>
                        <th className="w-28 py-2 font-normal">Stub Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      <ChildDirectories
                        directory={dir}
                        accessors={accessors}
                        services={services}
                        indentLevel={0}
                      />
                    </tbody>
                  </table>
                ) : null}
              </AnimateHeight>
            )}
          </li>
        ))}
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
