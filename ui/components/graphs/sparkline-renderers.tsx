import React from 'react';
import { init, last } from 'rambda';
import type { ReactNode } from 'react';

export type Renderer = {
  ({ lineColor, lineStrokeWidth }: { lineColor: string; lineStrokeWidth: number }): (
    ({ data, yCoord, xCoord }: { data: (number | undefined)[]; yCoord: (value: number) => number; xCoord: (index: number) => number }) => (
      ReactNode | ReactNode[]
    )
  );
};

export const pathRenderer: Renderer = ({ lineColor, lineStrokeWidth }: { lineColor: string; lineStrokeWidth: number }) => (
  ({ data, yCoord, xCoord }: {
    data: (number | undefined)[];
    yCoord: (value: number) => number;
    xCoord: (index: number) => number;
  }) => {
    if (data.some(i => i === undefined)) { throw new Error('pathRenderer can\'t handle undefined values'); }

    return (
      <path
        d={data.map((item, itemIndex) => (
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          `${itemIndex === 0 ? 'M' : 'L'} ${xCoord(itemIndex)} ${yCoord(item!)}`
        )).join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineStrokeWidth}
      />
    );
  }
);

export const pathRendererSkippingUndefineds: Renderer = ({ lineColor, lineStrokeWidth }) => (
  ({ data, yCoord, xCoord }) => {
    const mustSkip = (item: number | undefined): item is undefined => item === undefined;

    const nodes = data
      .reduce<{
        isSkipping: boolean;
        points: [xCoord: number, yCoord: number][];
      }[]>(
        (acc, item, itemIndex) => {
          // Skip the first element. We'll return to it in the next pass.
          if (itemIndex === 0) { return acc; }

          if (mustSkip(item)) { // skip this value
            const lastNode = last(acc);

            if (!lastNode) {
              // Nothing in the list so far, we're must skip this value, nothing to do.
              return acc;
            }

            if (lastNode.isSkipping) { return acc; } // Already skipping. Nothing to do.

            // We have a previous node, and it's not skipping, so we have a previous point.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return [...acc, { isSkipping: true, points: [last(lastNode.points)!] }];
          }

          // We shouldn't skip this value
          const lastNode = last(acc);

          if (!lastNode) {
            // Nothing in the list so far, we're not skipping this value, so we can just add it.
            return [...acc, { isSkipping: false, points: [[xCoord(itemIndex), yCoord(item)]] }];
          }

          if (lastNode.isSkipping) {
            // Previous node was skipping. We must terminate that, and start a new node.
            return [
              ...init(acc),
              { isSkipping: true, points: [...lastNode.points, [xCoord(itemIndex), yCoord(item)]] },
              { isSkipping: false, points: [[xCoord(itemIndex), yCoord(item)]] }
            ];
          }

          // Previous node was not skipping. We can just add this point to it.
          return [
            ...init(acc),
            { isSkipping: false, points: [...lastNode.points, [xCoord(itemIndex), yCoord(item)]] }
          ];
        }, []
      );

    const lastNode = last(nodes);
    const nodesToRender = (lastNode?.isSkipping && lastNode.points.length === 1)
      // Remove the last node, since it's an incomplete skipping node
      ? init(nodes)
      : nodes;

    return nodesToRender.map(node => (
      node.isSkipping
        ? (
          <line
            x1={node.points[0][0]}
            y1={node.points[0][1]}
            x2={node.points[1][0]}
            y2={node.points[1][1]}
            stroke={lineColor}
            strokeWidth={lineStrokeWidth}
            strokeDasharray="5,5"
          />
        )
        : (
          <path
            d={node.points.map((point, index) => (
              `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`
            )).join(' ')}
            fill="none"
            stroke={lineColor}
            strokeWidth={lineStrokeWidth}
          />
        )
    ));
  }
);
