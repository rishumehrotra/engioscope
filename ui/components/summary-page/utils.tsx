import { head, last, sum } from 'rambda';
import type { ReactNode } from 'react';
import React from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { ExternalLink } from '../common/Icons';

type SummaryGroups = SummaryMetrics['groups'][number]['summary'][string];

type ProcessedSummary = {
  count: number;
  velocity: number;
  velocityByWeek: number[];
  cycleTime: number;
  cycleTimeByWeek: number[];
  changeLeadTime: number;
  changeLeadTimeByWeek: number[];
  wipCount: number;
  wipAge: number;
  wipAddedThisMonth: number;
  wipAddedByWeek: number[];
  leakage: number;
  leakageByWeek: number[];
};

export const processSummary = (summary: SummaryGroups[string]): ProcessedSummary => ({
  count: summary.count,
  velocity: summary.velocity,
  velocityByWeek: summary.velocityByWeek,
  cycleTime: sum(summary.cycleTime) / summary.velocity,
  cycleTimeByWeek: summary.cycleTimeByWeek.map(
    cycleTimeByWeek => (cycleTimeByWeek.length === 0 ? 0 : (sum(cycleTimeByWeek) / cycleTimeByWeek.length))
  ),
  changeLeadTime: sum(summary.changeLeadTime) / summary.velocity,
  changeLeadTimeByWeek: summary.changeLeadTimeByWeek.map(
    changeLeadTimeByWeek => (changeLeadTimeByWeek.length === 0 ? 0 : (sum(changeLeadTimeByWeek) / changeLeadTimeByWeek.length))
  ),
  wipCount: summary.wipCount,
  wipAge: sum(summary.wipAge) / summary.wipCount,
  wipAddedThisMonth: summary.wipAddedThisMonth,
  wipAddedByWeek: summary.wipAddedByWeek,
  leakage: summary.leakage,
  leakageByWeek: summary.leakageByWeek
});

export const flattenSummaryGroups = (summaryGroups: SummaryGroups) => {
  type IntermediateFlattenedGroups = {
    count: number;
    velocity: number;
    velocityByWeek: number[];
    cycleTime: number[];
    cycleTimeByWeek: number[][];
    changeLeadTime: number[];
    changeLeadTimeByWeek: number[][];
    wipCount: number;
    wipAddedThisMonth: number;
    wipAddedByWeek: number[];
    wipAge: number[];
    leakage: number;
    leakageByWeek: number[];
  };

  const merged = Object.values(summaryGroups).reduce<IntermediateFlattenedGroups>((acc, group) => ({
    velocity: acc.velocity + group.velocity,
    velocityByWeek: group.velocityByWeek.reduce<number[]>(
      (acc, velocity, index) => {
        acc[index] = velocity + (acc[index] || 0);
        return acc;
      },
      acc.velocityByWeek
    ),
    changeLeadTime: [...acc.changeLeadTime, ...group.changeLeadTime],
    changeLeadTimeByWeek: group.changeLeadTimeByWeek.reduce<number[][]>(
      (acc, changeLeadTimes, index) => {
        acc[index] = (acc[index] || []).concat(changeLeadTimes);
        return acc;
      },
      acc.changeLeadTimeByWeek
    ),
    cycleTime: [...acc.cycleTime, ...group.cycleTime],
    cycleTimeByWeek: group.cycleTimeByWeek.reduce<number[][]>(
      (acc, cycleTimes, index) => {
        acc[index] = (acc[index] || []).concat(cycleTimes);
        return acc;
      },
      acc.cycleTimeByWeek
    ),
    wipCount: acc.wipCount + group.wipCount,
    wipAddedByWeek: group.wipAddedByWeek.reduce<number[]>(
      (acc, wipAdded, index) => {
        acc[index] = wipAdded + (acc[index] || 0);
        return acc;
      },
      acc.wipAddedByWeek
    ),
    wipAddedThisMonth: acc.wipAddedThisMonth + group.wipAddedThisMonth,
    wipAge: [...acc.wipAge, ...group.wipAge],
    count: acc.count + group.count,
    leakage: acc.leakage + group.leakage,
    leakageByWeek: group.leakageByWeek.reduce<number[]>(
      (acc, leakage, index) => {
        acc[index] = leakage + (acc[index] || 0);
        return acc;
      },
      acc.leakageByWeek
    )
  }), {
    count: 0,
    velocity: 0,
    velocityByWeek: [],
    cycleTime: [],
    cycleTimeByWeek: [],
    changeLeadTime: [],
    changeLeadTimeByWeek: [],
    wipCount: 0,
    wipAddedByWeek: [],
    wipAddedThisMonth: 0,
    wipAge: [],
    leakage: 0,
    leakageByWeek: []
  });

  return processSummary(merged);
};

export type SummaryItemProps = {
  group: SummaryMetrics['groups'][number];
  workItemTypes: SummaryMetrics['workItemTypes'];
};

export const getMetricCategoryDefinitionId = (
  workItemTypes: SummaryMetrics['workItemTypes'],
  field: string
) => Object.entries(workItemTypes).find(([, { name }]) => name[0] === field)?.[0];

export const renderGroupItem = (link: string) => (label: ReactNode, children?: React.ReactNode, anchor = '') => (
  <div className="group flex items-center">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500 flex items-center"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-semibold text-xl text-black">{label}</span>
      {children && (
        <span className="ml-2">
          {children}
        </span>
      )}
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </div>
);

export type SummaryGroupKey = keyof SummaryItemProps['group'];

export const allExceptExpectedKeys = (group: SummaryItemProps['group']) => {
  const expectedKeys: SummaryGroupKey[] = ['collection', 'groupName', 'portfolioProject', 'project', 'summary'];
  return Object.keys(group).filter(k => !expectedKeys.includes(k as SummaryGroupKey));
};

export const increaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return (
    // eslint-disable-next-line no-nested-ternary
    end - start > 0
      ? '#4add4a'
      : end - start === 0
        ? 'grey'
        : 'red'
  );
};

export const decreaseIsBetter = (data: number[]) => {
  const end = last(data) || 0;
  const start = head(data) || 0;

  return (
    // eslint-disable-next-line no-nested-ternary
    end - start < 0
      ? '#4add4a'
      : end - start === 0
        ? 'grey'
        : 'red'
  );
};
