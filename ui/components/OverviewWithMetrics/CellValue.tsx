import React from 'react';
import { identity } from 'rambda';
import { ExternalLink } from '../common/Icons.jsx';
import TinyAreaGraph, { graphConfig } from '../graphs/TinyAreaGraph.jsx';
import type { SingleWorkItemConfig } from '../../helpers/trpc.js';
import type { CellHelper, DrawerPropsSetter } from './cell-value-helpers/types.js';
import newGraphHelpers from './cell-value-helpers/new.js';

type CellValueProps = {
  data: CellHelper;
  workItemConfig: SingleWorkItemConfig;
  setDrawerProps: DrawerPropsSetter;
  openDrawer: () => void;
};

const CellValue = ({
  data,
  workItemConfig,
  setDrawerProps,
  openDrawer,
}: CellValueProps) => {
  const {
    value: valueToDisplay,
    color,
    graphData,
    onClick,
  } = data(workItemConfig, setDrawerProps, openDrawer);

  return (
    <div className="flex flex-row items-center group">
      {valueToDisplay}
      <button type="button" title="drawer-button" onClick={onClick}>
        <ExternalLink className="w-4 mx-2 link-text opacity-0 group-hover:opacity-100" />
      </button>
      {graphData ? (
        <div className="w-12">
          <TinyAreaGraph
            data={graphData}
            itemToValue={identity}
            color={color}
            graphConfig={{ ...graphConfig.small, width: 50 }}
            className="mb-3 inline-block"
          />
        </div>
      ) : null}
    </div>
  );
};

CellValue.newGraph = newGraphHelpers;

export default CellValue;
