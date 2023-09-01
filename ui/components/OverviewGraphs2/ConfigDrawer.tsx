import type { FormEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { head } from 'rambda';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject, useQueryContext } from '../../hooks/query-hooks.js';
import DrawerTabs from '../repo-summary/DrawerTabs.jsx';
import { WorkTypeTabConfigBody } from './WorkTypeTabConfigBody.jsx';

const useClearCache = () => {
  const utils = trpc.useContext();

  return useCallback(() => utils.workItems.invalidate(), [utils.workItems]);
};
type ConfigDrawerProps = {
  closeDrawer: () => void;
};

export const ConfigDrawer = ({ closeDrawer }: ConfigDrawerProps) => {
  const queryContext = useQueryContext();
  const cnp = useCollectionAndProject();
  const clearCache = useClearCache();
  const pageConfig = trpc.workItems.getPageConfig.useQuery(
    { queryContext },
    { keepPreviousData: true }
  );
  const saveConfigs = trpc.config.updateProjectConfig.useMutation();

  const [modifiedWorkItemConfigs, setModifiedWorkItemConfigs] = useState<
    SingleWorkItemConfig[]
  >(pageConfig.data?.workItemsConfig || []);

  useEffect(() => {
    if (pageConfig.data?.workItemsConfig) {
      setModifiedWorkItemConfigs(pageConfig.data.workItemsConfig);
    }
  }, [pageConfig.data?.workItemsConfig]);

  const submitForm = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      saveConfigs
        .mutateAsync({
          ...cnp,
          config: modifiedWorkItemConfigs.map(wic => ({
            type: wic.name[0],
            startStates: wic.startStates,
            endStates: wic.endStates,
            groupByField: head(Object.keys(wic.groupByField || {})),
            ignoreStates: wic.ignoreStates,
            rootCause: Object.keys(wic.rootCause || {}),
            workCenters: wic.workCenters,
            devCompletionStates: wic.devCompleteStates,
          })),
        })
        .then(clearCache)
        .then(closeDrawer)
        .catch(() => {
          // set error message
        });
    },
    [clearCache, closeDrawer, cnp, modifiedWorkItemConfigs, saveConfigs]
  );

  return (
    <form onSubmit={submitForm}>
      <DrawerTabs
        tabs={
          pageConfig.data?.workItemsConfig?.map(config => ({
            title: config.name[0],
            key: config.name[1],
            // eslint-disable-next-line react/no-unstable-nested-components
            BodyComponent: () => (
              <WorkTypeTabConfigBody
                config={modifiedWorkItemConfigs.find(
                  wic => wic.name[0] === config.name[0]
                )}
                setConfig={setter => {
                  setModifiedWorkItemConfigs(prev => {
                    return prev.map(wic => {
                      if (wic.name[0] === config.name[0]) {
                        return setter(wic);
                      }
                      return wic;
                    });
                  });
                }}
                key={config.name[1]}
              />
            ),
          })) || []
        }
      />
      <div className="text-right px-6 whitespace-nowrap mt-4 flex gap-4 justify-evenly mb-5">
        <button type="reset" className="secondary-button w-full" onClick={closeDrawer}>
          Cancel
        </button>
        <button
          type="submit"
          className="primary-button w-full hover:bg-blue-700"
          disabled={saveConfigs.isLoading || pageConfig.isLoading}
        >
          Save
        </button>
      </div>
    </form>
  );
};
