import prettyMilliseconds from 'pretty-ms';
import type { UIWorkItem, UIWorkItemRevision, UIWorkItemType } from '../../../shared/types';
import { mediumDate } from '../../helpers/utils';

export const svgWidth = 1300;
export const textWidth = 270;
export const textHeight = 30;
export const barStartPadding = 30;
export const barHeight = 20;
export const rowPadding = 3;
export const axisLabelsHeight = 20;
export const axisLabelsWidth = 80;
export const bottomScaleHeight = 80;

export const svgHeight = (childrenCount: number) => (
  ((textHeight + (rowPadding * 2)) * childrenCount) + axisLabelsHeight
);

export const barYCoord = (targetIndex: number) => (
  (targetIndex * (textHeight + (rowPadding * 2))) + ((textHeight - barHeight) / 2)
);

export const getMinDateTime = (revisions: UIWorkItemRevision[]) => Math.min(
  ...revisions.map(r => new Date(r.date).getTime())
);

export const getMaxDateTime = (revisions: UIWorkItemRevision[]) => Math.max(
  ...revisions.map(r => new Date(r.date).getTime())
);

export const xCoordToDate = (minDate: number, maxDate: number) => (
  (xCoord: number) => (
    (
      (xCoord - textWidth - barStartPadding)
      / (svgWidth - textWidth - barStartPadding)
    ) * (maxDate - minDate)
  ) + minDate
);

export const xCoordConverterWithin = (minDateTime: number, maxDateTime: number) => (
  (time: string | Date) => {
    const date = new Date(time);
    const xCoordWithoutText = (
      (date.getTime() - minDateTime)
      / (maxDateTime - minDateTime)
    ) * (svgWidth - textWidth - barStartPadding);
    return (xCoordWithoutText < 0 ? 0 : xCoordWithoutText) + textWidth + barStartPadding;
  }
);

export const createXCoordConverterFor = (revisions: UIWorkItemRevision[]) => {
  const minDateTime = getMinDateTime(revisions);
  const maxDateTime = getMaxDateTime(revisions);

  return xCoordConverterWithin(minDateTime, maxDateTime);
};

export const barWidthUsing = (timeToXCoord: (time: string) => number) => (
  (revisions: UIWorkItemRevision[], index: number) => {
    if (revisions.length === 1) {
      return Math.max(svgWidth - timeToXCoord(revisions[0].date), 3);
    }
    return Math.max(timeToXCoord(revisions[index + 1].date) - timeToXCoord(revisions[index].date), 3);
  }
);

export const makeTransparent = (rgb: string) => {
  if (rgb.length > 7) { // already has a rgbA component
    return `${rgb.slice(0, -2)}11`;
  }

  return `${rgb}11`;
};

export const makeDarker = (rgb: string) => {
  if (rgb.length > 7) { // already has a rgbA component
    return `${rgb.slice(0, -2)}30`;
  }

  return `${rgb}11`;
};

export const revisionTooltip = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => `
  <b>${revision.state} → ${nextRevision.state}</b><br />
  ${prettyMilliseconds(new Date(nextRevision.date).getTime() - new Date(revision.date).getTime(), { unitCount: 2, verbose: true })}<br />
  <div class="text-gray-400">
    ${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(nextRevision.date))}
  </div>
`;

export const rowItemTooltip = (workItem: UIWorkItem, type: UIWorkItemType) => `
  <div class="max-w-xs">
    <div class="pl-3" style="text-indent: -1.15rem">
      <span class="font-bold">
        <img src="${type.icon}" width="14" height="14" class="inline-block -mt-1" />
        ${type.name[0]} #${workItem.id}:
      </span>
      ${workItem.title}
    </div>
    ${workItem.env ? (`
      <div class="mt-2">
        <span class="font-bold">Environment: </span>
        ${workItem.env}
      </div>
    `) : ''}
    <div class="mt-2">
      <span class="font-bold">Project: </span>
      ${workItem.project}
    </div>
  </div>
`;
