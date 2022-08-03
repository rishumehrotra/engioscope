import React from 'react';
import { last } from 'rambda';
import type { ReactNode } from 'react';

export type Renderer = {
  ({ lineColor, lineStrokeWidth, strokeDasharray }: { lineColor: string; lineStrokeWidth: number; strokeDasharray?: string }): (
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
    // eslint-disable-next-line unicorn/prefer-includes
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

const mustSkip = (item: number | undefined | null): item is undefined | null => (
  item === undefined || item === null
);

export const pathRendererSkippingUndefineds: Renderer = ({ lineColor, lineStrokeWidth, strokeDasharray }) => (
  ({ data, yCoord, xCoord }) => {
    type Point = [xCoord: number, yCoord: number];

    const drawLine = (continuous: boolean) => (p1: Point, p2: Point, index: number) => (
      <line
        key={index}
        x1={p1[0]}
        y1={p1[1]}
        x2={p2[0]}
        y2={p2[1]}
        stroke={lineColor}
        strokeWidth={lineStrokeWidth}
        strokeDasharray={continuous ? '' : (strokeDasharray || '7,5')}
      />
    );

    const brokenLine = drawLine(false);
    const continuousLine = drawLine(true);

    const nodes = data
      .map<(Point | undefined)>((item, itemIndex) => (
        mustSkip(item) ? undefined : [xCoord(itemIndex), yCoord(item)]
      ))
      .reduce<(Point | undefined)[]>((acc, item) => {
        if (acc.length === 0 && item === undefined) return [];

        if (item === undefined) {
          if (last(acc) === undefined) return acc;
          return [...acc, undefined];
        }

        return [...acc, item];
      }, []);

    const toRender = nodes.reduce<ReactNode[]>((acc, item, itemIndex) => {
      if (itemIndex === 0) return acc;
      if (item === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const prevItem = nodes[itemIndex - 1]!; // Prev item definitely exists
        const nextItem = nodes[itemIndex + 1];

        if (!nextItem) { // trailing broken line
          return [...acc, brokenLine(prevItem, [xCoord(data.length - 1), prevItem[1]], itemIndex)];
        }

        return [...acc, brokenLine(prevItem, nextItem, itemIndex)];
      }

      const prevItem = nodes[itemIndex - 1];
      if (prevItem === undefined) return acc;
      return [...acc, continuousLine(prevItem, item, itemIndex)];
    }, [
      // start with an skip segment. Might be zero length.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      brokenLine([xCoord(0), nodes[0]![1]], nodes[0]!, -1)
    ]);

    return toRender;
  }
);
