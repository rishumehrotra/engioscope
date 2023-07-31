import React, { Fragment, useMemo } from 'react';
import { range } from 'rambda';
import GraphSection from './GraphSection.jsx';
import type { RouterClient } from '../../helpers/trpc.js';
import { trpc } from '../../helpers/trpc.js';
import { useCollectionAndProject } from '../../hooks/query-hooks.js';

type SingleWorkItemConfig = NonNullable<
  RouterClient['workItems']['getWorkItemConfig']['workItemsConfig']
>[number];

// const queryContext = useQueryContext();
// const graph = trpc.workItems.getNewGraphForWorkItem.useQuery({
//   queryContext,
//   workItemType: 'Feature',
// });

type GraphCardProps = {
  workItemConfig: SingleWorkItemConfig;
  index: number;
};

const GraphCard = ({ workItemConfig, index }: GraphCardProps) => {
  return (
    <div className="contents">
      <h3 style={{ gridArea: `heading${index % 2}` }}>{workItemConfig.name[1]}</h3>
      <p style={{ gridArea: `subheading${index % 2}` }}>{workItemConfig.name[1]}</p>
      <div
        className={index === 0 ? 'mt-5' : ''}
        style={{ gridArea: `graphBlock${index % 2}` }}
      >
        foobar
      </div>
    </div>
  );
};

const New = () => {
  const cnp = useCollectionAndProject();
  const workItemConfig = trpc.workItems.getWorkItemConfig.useQuery(cnp);

  const graphGrid = useMemo(() => {
    if (!workItemConfig.data?.workItemsConfig) return;

    const rowCount = Math.ceil(workItemConfig.data.workItemsConfig.length / 2);

    return range(0, rowCount).reduce<
      [SingleWorkItemConfig | undefined, SingleWorkItemConfig | undefined][]
    >((acc, rowIndex) => {
      acc.push([
        workItemConfig.data.workItemsConfig?.[2 * rowIndex],
        workItemConfig.data.workItemsConfig?.[2 * rowIndex + 1],
      ]);
      return acc;
    }, []);
  }, [workItemConfig.data?.workItemsConfig]);

  return (
    <GraphSection
      heading="New work items"
      subheading="Work items on which work work has started"
    >
      {graphGrid?.map((configs, rowIndex) => (
        <div
          className="grid grid-cols-2"
          style={{
            gridTemplateAreas: `"heading0 heading1" "subheading0 subheading1" "graphBlock0 graphBlock1"`,
          }}
        >
          {/* eslint-disable-next-line react/no-array-index-key */}
          <Fragment key={rowIndex}>
            {configs.map((config, configIndex) => {
              if (!config) return null;
              return <GraphCard workItemConfig={config} index={configIndex} />;
            })}
          </Fragment>
        </div>
      ))}
    </GraphSection>
  );
};

export default New;
