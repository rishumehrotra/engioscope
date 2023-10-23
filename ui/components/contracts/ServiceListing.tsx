import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { byString } from 'sort-lib';
import { prop, sum } from 'rambda';
import { Minus, Plus } from 'react-feather';
import { twJoin } from 'tailwind-merge';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import type { Service } from './utils.js';
import { serviceAccessors } from './utils.js';
import ServiceBlock from './ServiceBlock.jsx';
import { divide, toPercentage } from '../../../shared/utils.js';
import AnimateHeight from '../common/AnimateHeight.jsx';
import type { ContractDirectory } from '../../../backend/models/contracts.js';
import { num } from '../../helpers/utils.js';

const treeGridClassName = 'grid grid-cols-[1fr_7.5rem_10rem_6rem] px-4';

const coveredOperations = (directory: ContractDirectory): number =>
  sum(directory.coverage.map(prop('coveredOperations'))) +
  sum(directory.childDirectories.map(coveredOperations));

const totalOperations = (directory: ContractDirectory): number =>
  sum(directory.totalOps.map(prop('totalOps'))) +
  sum(directory.childDirectories.map(totalOperations));

const stubUsage = (directory: ContractDirectory): number =>
  sum(directory.stubUsage.map(prop('usedOperations'))) +
  sum(directory.childDirectories.map(stubUsage));

const servicesForDirectory =
  (services: Service[]) =>
  (directory: ContractDirectory): Service[] => {
    return services.filter(service =>
      service.endpoints.some(endpoint => directory.specIds.includes(endpoint.specId))
    );
  };

const hasChildren = (directory: ContractDirectory, services: Service[]) =>
  directory.childDirectories.length > 0 ||
  servicesForDirectory(services)(directory).length > 0;

const directoryHasServicesSomewhere =
  (services: Service[]) =>
  (directory: ContractDirectory): boolean => {
    if (directory.specIds.length) {
      return services.some(service =>
        service.endpoints.some(endpoint => directory.specIds.includes(endpoint.specId))
      );
    }

    return directory.childDirectories.some(directoryHasServicesSomewhere(services));
  };

const ChildDirectories = ({
  services,
  directory,
  indentLevel,
  accessors,
}: {
  directory: ContractDirectory;
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
      {directory.childDirectories.map(dir => {
        const coveredOps = coveredOperations(dir);
        const totalOps = totalOperations(dir);
        const stubUsageOps = stubUsage(dir);

        return (
          <Fragment key={dir.directoryName}>
            <button
              onClick={toggleExpand(dir.directoryName)}
              className={twJoin(
                treeGridClassName,
                'cursor-pointer border-b border-theme-seperator w-full text-left',
                !hasChildren(dir, services) && 'opacity-40'
              )}
            >
              <div className="py-2">
                <span
                  className="inline-block"
                  style={{ paddingLeft: `${indentLevel}rem` }}
                >
                  {expandedDirectories[dir.directoryName] === 'open' ? (
                    <Minus className="inline-block mr-2" size={16} />
                  ) : (
                    <Plus className="inline-block mr-2" size={16} />
                  )}
                  {dir.directoryName}
                </span>
              </div>
              <div className="py-2">
                {divide(coveredOps, totalOps).map(toPercentage).getOr('-')}
              </div>
              <div className="py-2">{num(totalOps)}</div>
              <div className="py-2">
                {divide(stubUsageOps, totalOps).map(toPercentage).getOr('-')}
              </div>
            </button>
            {expandedDirectories[dir.directoryName] === 'closed' ? null : (
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
                {servicesForDirectory(services)(dir).map(service => (
                  <div
                    key={service.serviceId}
                    style={{ paddingLeft: `${indentLevel + 1}rem` }}
                  >
                    <ServiceBlock
                      key={service.serviceId}
                      service={service}
                      accessors={accessors}
                    />
                  </div>
                ))}
              </AnimateHeight>
            )}
          </Fragment>
        );
      })}
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

const ServiceListingUsingCentralRepoListingForOneRepo = ({
  services,
  accessors,
  // repoUrl,
  rootDirectory,
}: {
  services: Service[];
  accessors: ReturnType<typeof serviceAccessors>;
  // repoUrl: string;
  rootDirectory: ContractDirectory;
}) => {
  const dirs = useMemo(
    () => rootDirectory.childDirectories.sort(byString(prop('directoryName'))),
    [rootDirectory]
  );

  // const dirsHavingServices = useMemo(
  //   () =>
  //     rootDirectory.childDirectories
  //       .filter(directoryHasServicesSomewhere(services))
  //       .sort(byString(prop('directoryName'))),
  //   [rootDirectory.childDirectories, services]
  // );

  // const dirsNotHavingServices = useMemo(
  //   () =>
  //     rootDirectory.childDirectories
  //       .filter(compose(not, directoryHasServicesSomewhere(services)))
  //       .sort(byString(prop('directoryName'))),
  //   [rootDirectory.childDirectories, services]
  // );

  const [expandedDirectories, setExpandedDirectories] = useState<
    Record<string, 'open' | 'closing' | 'closed'>
  >(dirs.reduce((acc, dir) => ({ ...acc, [dir.directoryName]: 'closed' }), {}));

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
      {/* {dirsNotHavingServices.length > 0 && (
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
      )} */}

      <ul>
        {dirs.map(dir => {
          const coverageOps = coveredOperations(dir);
          const totalOps = totalOperations(dir);
          const stubUsageOps = stubUsage(dir);

          return (
            <li
              key={dir.directoryName}
              className={twJoin(
                'border border-theme-seperator rounded-md mb-4',
                !directoryHasServicesSomewhere(services)(dir) && 'opacity-40'
              )}
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
                        {divide(coverageOps, totalOps).map(toPercentage).getOr('-')}
                      </h2>
                      <p className="text-gray-600 text-sm font-normal uppercase text-right">
                        API Coverage
                      </p>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-right">
                        {num(totalOps)}
                      </h2>
                      <p className="text-gray-600 text-sm font-normal uppercase text-right">
                        Total Operations
                      </p>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-right">
                        {divide(stubUsageOps, totalOps).map(toPercentage).getOr('-')}
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
                    <div className="bg-theme-page-content">
                      <div
                        className={twJoin(
                          treeGridClassName,
                          'bg-theme-page border-y border-theme-seperator',
                          'uppercase text-xs'
                        )}
                      >
                        <div className="py-2">Directory</div>
                        <div className="py-2">API Coverage</div>
                        <div className="py-2">Total Operations</div>
                        <div className="py-2">Stub Usage</div>
                      </div>
                      <ChildDirectories
                        directory={dir}
                        accessors={accessors}
                        services={services}
                        indentLevel={0}
                      />
                    </div>
                  ) : null}
                </AnimateHeight>
              )}
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
  return repoTree.map(({ repoUrl, dir }) => (
    <ServiceListingUsingCentralRepoListingForOneRepo
      key={repoUrl}
      services={services}
      accessors={accessors}
      rootDirectory={dir}
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
