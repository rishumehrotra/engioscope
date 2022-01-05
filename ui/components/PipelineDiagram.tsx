import { add, range } from 'rambda';
import React, { useMemo } from 'react';
import { exists } from '../helpers/utils';
import type { PipelineStageWithCounts } from './pipeline-utils';

type Grid = (PipelineStageWithCounts | undefined)[][];

const cellWidth = 200;
const cellHeight = 58;
const cellHorizontalSpacing = 50;
const cellVerticalSpacing = 15;

const getRowHeightUsing = (nodes: Record<number, number[]>) => {
  const getRowHeight = (rank: number): number => (
    nodes[rank]?.length
      ? Math.max(...nodes[rank].map(getRowHeight), nodes[rank].length)
      : 1
  );

  return getRowHeight;
};

const stagesTree = (stages: PipelineStageWithCounts[]) => (
  stages.reduce<{ nodes: Record<number, number[]>; root: number[] }>(
    (acc, stage) => {
      stage.conditions.forEach(condition => {
        if (condition.type !== 'environmentState') return;
        const matchingNode = stages.find(s => s.name === condition.name);
        if (!matchingNode) return;
        acc.nodes[matchingNode.rank] = acc.nodes[matchingNode.rank] || [];
        acc.nodes[matchingNode.rank].push(stage.rank);
        acc.root = acc.root.filter(s => s !== stage.rank);
      });
      return acc;
    },
    { nodes: {}, root: stages.map(s => s.rank) }
  )
);

const getDepthUsing = (nodes: Record<number, number[]>) => {
  const getDepth = (rank: number): number => {
    const children = nodes[rank];
    if (!children?.length) return 1;
    return Math.max(...children.map(getDepth)) + 1;
  };

  return getDepth;
};

const stagesGrid = (stages: PipelineStageWithCounts[]): Grid => {
  const tree = stagesTree(stages);
  const stagesByRank = stages.reduce<Record<number, PipelineStageWithCounts>>(
    (acc, stage) => {
      acc[stage.rank] = stage;
      return acc;
    },
    {}
  );
  const getDepth = getDepthUsing(tree.nodes);
  const getHeight = getRowHeightUsing(tree.nodes);
  const maxDepth = Math.max(...tree.root.map(getDepth));
  const totalHeight = tree.root.map(getHeight).reduce(add, 0);

  const grid: Grid = range(0, totalHeight)
    .map(() => range(0, maxDepth).map(() => undefined));

  const gridContains = (rank: number) => (
    grid.some(row => row.some(s => s?.rank === rank))
  );

  const placeNode = (rank: number, rowOffset: number, colOffset: number) => {
    if (gridContains(rank)) return;
    grid[rowOffset][colOffset] = stagesByRank[rank];
    (tree.nodes[rank] || []).forEach((child, index) => {
      placeNode(child, rowOffset + index, colOffset + 1);
    });
  };

  let rootRowOffset = 0;

  tree.root.forEach(root => {
    placeNode(root, rootRowOffset, 0);
    rootRowOffset += getHeight(root);
  });

  return grid.filter(row => row.some(exists));
};

const getParentLocationsUsing = (grid: Grid) => (
  (stage: PipelineStageWithCounts) => (
    stage.conditions
      .filter(c => c.type === 'environmentState')
      .map(condition => {
        const rowIndex = grid.findIndex(row => row.some(s => s?.name === condition.name));
        if (rowIndex === -1) return;
        const colIndex = grid[rowIndex].findIndex(s => s?.name === condition.name);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return [rowIndex, colIndex, grid[rowIndex][colIndex]!] as const;
      })
      .filter(exists)
  )
);

const linePathUsing = (colIndex: number, rowIndex: number) => {
  const endingX = colIndex * (cellWidth + cellHorizontalSpacing);
  const endingY = rowIndex * (cellHeight + cellVerticalSpacing) + (cellHeight / 2);

  return (fromColIndex: number, fromRowIndex: number) => {
    const startingX = fromColIndex * (cellWidth + cellHorizontalSpacing) + cellWidth;
    const startingY = fromRowIndex * (cellHeight + cellVerticalSpacing) + (cellHeight / 2);
    const isFarAway = endingX - startingX > cellHorizontalSpacing;

    const path = [
      `M${startingX},${startingY}`,
      isFarAway ? `H${endingX - 50}` : '',
      `C${isFarAway ? endingX : startingX + 50},${startingY} ${endingX - 50},${endingY}`,
      `${endingX} ${endingY}`
    ].join(' ');
    return path;
  };
};

const stageLabelColor = (stage: PipelineStageWithCounts) => {
  if (stage.total === 0) return 'text-gray-700';
  if (stage.successful !== stage.total) return 'text-yellow-600';
  return 'text-green-800';
};

type PipelineDiagramProps = {
  stages: PipelineStageWithCounts[];
};

const PipelineDiagram: React.FC<PipelineDiagramProps> = ({ stages }) => {
  const grid = useMemo(() => stagesGrid(stages), [stages]);

  const gridWidth = useMemo(() => (
    grid[0].length * (cellWidth + cellHorizontalSpacing) - cellHorizontalSpacing
  ), [grid]);

  const gridHeight = useMemo(() => (
    grid.length * (cellHeight + cellVerticalSpacing) - cellVerticalSpacing
  ), [grid]);

  const getParentLocations = useMemo(() => getParentLocationsUsing(grid), [grid]);

  return (
    <div className="overflow-y-auto w-full">
      <svg
        width={gridWidth}
        height={gridHeight}
      >
        {grid.map((row, rowIndex) => (
          row.map((stage, colIndex) => {
            if (!stage) return null;

            const linePath = linePathUsing(colIndex, rowIndex);

            return (
              <g key={stage.rank}>
                <rect
                  x={colIndex * (cellWidth + cellHorizontalSpacing)}
                  y={rowIndex * (cellHeight + cellVerticalSpacing)}
                  width={cellWidth}
                  height={cellHeight}
                  fill="white"
                />
                <foreignObject
                  x={colIndex * (cellWidth + cellHorizontalSpacing)}
                  y={rowIndex * (cellHeight + cellVerticalSpacing)}
                  width={cellWidth}
                  height={cellHeight}
                >
                  <div
                    className={`border-gray-300 rounded-md overflow-hidden text-sm ${stage.total === 0 ? 'opacity-40' : ''}`}
                    style={{ height: `${cellHeight}px`, borderWidth: '1px' }}
                  >
                    <div className="text-gray-600 truncate px-2 py-1 bg-gray-100 font-semibold">
                      {stage.name}
                    </div>
                    <div className={`px-2 py-1 ${stageLabelColor(stage)}`}>
                      <span className="font-semibold">
                        {stage.successful}
                      </span>
                      <span className="opacity-70">
                        {` / ${stage.total} succeeded`}
                      </span>
                    </div>
                  </div>
                </foreignObject>
                {getParentLocations(stage).map(([fromRowIndex, fromColIndex, parentStage]) => (
                  <path
                    key={`${stage.rank}-${fromRowIndex}-${fromColIndex}`}
                    d={linePath(fromColIndex, fromRowIndex)}
                    stroke={(parentStage.total === 0 || stage.total === 0) ? '#eee' : '#ddd'}
                    strokeWidth={2}
                    fill="none"
                  />
                ))}
              </g>
            );
          })
        ))}
      </svg>
    </div>
  );
};

export default PipelineDiagram;
