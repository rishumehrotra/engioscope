import { sum } from 'rambda';
import React from 'react';
import type { SummaryMetrics } from '../../../shared/types';
import { ExternalLink } from '../common/Icons';

type SummaryGroups = SummaryMetrics['groups'][number]['summary'][string];

type ProcessedSummary = {
  count: number;
  velocity: number;
  cycleTime: number;
  changeLeadTime: number;
  wipCount: number;
  wipAge: number;
  leakage: number;
};

export const processSummary = (summary: SummaryGroups[string]): ProcessedSummary => ({
  count: summary.count,
  velocity: summary.velocity,
  cycleTime: sum(summary.cycleTime) / summary.velocity,
  changeLeadTime: sum(summary.changeLeadTime) / summary.velocity,
  wipCount: summary.wipCount,
  wipAge: sum(summary.wipAge) / summary.wipCount,
  leakage: summary.leakage
});

export const flattenSummaryGroups = (summaryGroups: SummaryGroups) => {
  type IntermediateFlattenedGroups = {
    count: number;
    velocity: number;
    cycleTime: number[];
    changeLeadTime: number[];
    wipCount: number;
    wipAge: number[];
    leakage: number;
  };

  const merged = Object.values(summaryGroups).reduce<IntermediateFlattenedGroups>((acc, group) => ({
    velocity: acc.velocity + group.velocity,
    changeLeadTime: [...acc.changeLeadTime, ...group.changeLeadTime],
    cycleTime: [...acc.cycleTime, ...group.cycleTime],
    wipCount: acc.wipCount + group.wipCount,
    wipAge: [...acc.wipAge, ...group.wipAge],
    count: acc.count + group.count,
    leakage: acc.leakage + group.leakage
  }), {
    count: 0,
    velocity: 0,
    cycleTime: [],
    changeLeadTime: [],
    wipCount: 0,
    wipAge: [],
    leakage: 0
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

export const renderGroupItem = (link: string) => (label: string, anchor = '') => (
  <div className="group flex items-center">
    <a
      href={`${link}${anchor}`}
      className="text-blue-500 flex"
      target="_blank"
      rel="noreferrer"
    >
      <span className="font-semibold text-xl text-black">{label}</span>
      <ExternalLink className="w-4 opacity-0 group-hover:opacity-100 ml-1" />
    </a>
  </div>
);

export type SummaryGroupKey = keyof SummaryItemProps['group'];

export const allExceptExpectedKeys = (group: SummaryItemProps['group']) => {
  const expectedKeys: SummaryGroupKey[] = ['collection', 'groupName', 'portfolioProject', 'project', 'summary'];
  return Object.keys(group).filter(k => !expectedKeys.includes(k as SummaryGroupKey));
};
