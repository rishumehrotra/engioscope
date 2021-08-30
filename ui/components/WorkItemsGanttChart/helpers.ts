import prettyMilliseconds from 'pretty-ms';
import type { UIWorkItem, UIWorkItemRevision } from '../../../shared/types';
import { mediumDate } from '../../helpers/utils';

export const svgWidth = 1100;
export const textWidth = 270;
export const textHeight = 30;
export const barStartPadding = 30;
export const barHeight = 20;
export const rowPadding = 3;
export const axisLabelsHeight = 20;
export const axisLabelsWidth = 80;

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

export const contrastColour = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  return luma > 140 ? '#222' : '#fff';
};

export const revisionTooltip = (revision: UIWorkItemRevision, nextRevision: UIWorkItemRevision) => `
  <b>${revision.state} → ${nextRevision.state}</b><br />
  ${prettyMilliseconds(new Date(nextRevision.date).getTime() - new Date(revision.date).getTime(), { unitCount: 2, verbose: true })}<br />
  <div class="text-gray-400">
    ${mediumDate(new Date(revision.date))} → ${mediumDate(new Date(nextRevision.date))}
  </div>
`;

type CltStats = {clt: number| undefined; cltStage: 'Dev not done' | 'Dev done' | 'Done'};

export const cltStats = (workItem: UIWorkItem): CltStats => {
  if (workItem.clt?.start && workItem.clt.end) {
    return {
      cltStage: 'Done',
      clt: new Date(workItem.clt?.end).getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  if (workItem.clt?.start && !workItem.clt?.end) {
    return {
      cltStage: 'Dev done',
      clt: new Date().getTime() - new Date(workItem.clt?.start).getTime()
    };
  }
  return {
    cltStage: 'Dev not done',
    clt: undefined
  };
};

export const cltStatsTooltip = (cltStats: CltStats) => {
  const { clt, cltStage } = cltStats;
  if (clt === undefined) return '';

  const prettyClt = prettyMilliseconds(clt, { compact: true, verbose: true });
  if (cltStage === 'Done') {
    return `<span class="font-bold">CLT (dev done to production):</span> <span class="text-green-500">${prettyClt}</span>`;
  }
  if (cltStage === 'Dev done') {
    return `<span class="font-bold">${cltStage}</span> <span class="text-red-300">${prettyClt}</span> ago`;
  }
};

export const rowItemTooltip = (workItem: UIWorkItem) => {
  const { cltStage, clt } = cltStats(workItem);
  return `
    <div class="max-w-xs">
      <div class="pl-3" style="text-indent: -1.15rem">
        <span class="font-bold">
          <img src="${workItem.icon}" width="14" height="14" class="inline-block -mt-1" />
          ${workItem.type} #${workItem.id}:
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
      <div class="mt-2">
        ${cltStatsTooltip({ cltStage, clt })}
        </div>
    </div>
  `;
};
