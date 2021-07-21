import { lens } from '@rakeshpai/lens.ts';
import { applySpec, pipe } from 'rambda';

export type OTWPullRequests = [
  total: number,
  active: number,
  abandoned: number,
  completed: number,
  timeToApprove: 0 | [average: string, min: string, max: string]
];

export type UIPullRequests = {
  total: number;
  active: number;
  abandoned: number;
  completed: number;
  timeToApprove: null | { average: string; min: string; max: string };
};

const pullRequestsLens = lens<OTWPullRequests>();

const totalPRsLens = pullRequestsLens[0];
const activePRsLens = pullRequestsLens[1];
const abandonedPRsLens = pullRequestsLens[2];
const completedPRsLens = pullRequestsLens[3];
const timeToApproveLens = lens<OTWPullRequests, UIPullRequests['timeToApprove']>(
  prs => {
    const timeToApprove = prs[4];
    if (!prs) return null;
    return { average: timeToApprove[0], min: timeToApprove[1], max: timeToApprove[2] };
  },
  timeToApprove => prs => {
    const p: OTWPullRequests = [...prs];
    if (timeToApprove === null) p[4] = 0;
    else p[4] = [timeToApprove.average, timeToApprove.min, timeToApprove.max];
    return p;
  }
);

export const viewPrs = (prs: OTWPullRequests) => applySpec<UIPullRequests>({
  total: totalPRsLens.get(),
  active: activePRsLens.get(),
  abandoned: abandonedPRsLens.get(),
  completed: completedPRsLens.get(),
  timeToApprove: timeToApproveLens.get()
})(prs);

export const setPrs = (prs: UIPullRequests) => pipe(
  totalPRsLens.set(prs.total),
  activePRsLens.set(prs.active),
  abandonedPRsLens.set(prs.abandoned),
  completedPRsLens.set(prs.completed),
  timeToApproveLens.set(prs.timeToApprove)
);
