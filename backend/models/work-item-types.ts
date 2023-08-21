import pluralize from 'pluralize';
import type { z } from 'zod';
import { asc, byNum } from 'sort-lib';
import { prop } from 'rambda';
import { exists } from '../../shared/utils.js';
import { configForCollection } from '../config.js';
import workItemIconSvgs from '../work-item-icon-svgs.js';
import type { collectionAndProjectInputParser } from './helpers.js';
import type { WorkItemType } from './mongoose-models/WorkItemType.js';
import { WorkItemTypeModel } from './mongoose-models/WorkItemType.js';
import { getProjectConfig } from './config.js';

const iconSvg = ({ id, url }: WorkItemType['icon']) => {
  const { searchParams } = new URL(url);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return workItemIconSvgs[id](searchParams.get('color')!);
};

export const getWorkItemConfig = async ({
  collectionName,
  project,
}: z.infer<typeof collectionAndProjectInputParser>) => {
  const config = await getProjectConfig(collectionName, project);

  const workItemTypes = await WorkItemTypeModel.find({
    collectionName,
    project,
    referenceName: { $in: config.workItemsConfig?.map(w => w.type) },
  }).lean();

  return {
    environments: config.environments,
    workItemsConfig: config.workItemsConfig
      ?.map(workItemConfig => {
        const match = workItemTypes.find(
          wit => wit.referenceName === workItemConfig.type
        );

        if (!match) return;

        const fieldName = (fieldId: string) => {
          const fieldDetails = match.fields.find(f => f.referenceName === fieldId);
          if (!fieldDetails) return;
          return [fieldDetails.referenceName, fieldDetails.name] as const;
        };

        const fieldNames = (fieldIds: string[]) => {
          return Object.fromEntries(fieldIds.map(fieldName).filter(exists));
        };

        return {
          name: [match.referenceName, pluralize(match.referenceName)] as const,
          icon: `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg(match.icon))}`,
          groupByField:
            workItemConfig.groupByField && fieldNames([workItemConfig.groupByField]),
          startStates: workItemConfig.startStates,
          endStates: workItemConfig.endStates,
          devCompleteStates: workItemConfig.devCompletionStates,
          rootCause: workItemConfig.rootCause && fieldNames(workItemConfig.rootCause),
          ignoreStates: workItemConfig.ignoreStates,
          workCenters: workItemConfig.workCenters,
        };
      })
      .filter(exists),
  };
};

export const getWorkItemTypes = async ({
  collectionName,
  project,
}: z.infer<typeof collectionAndProjectInputParser>) => {
  const collectionConfig = configForCollection(collectionName);
  const wits = collectionConfig?.workitems.types || [];

  // TODO: FIXME This doesn't belong here, maybe?
  const workItemTypes = await WorkItemTypeModel.find(
    {
      collectionName,
      project,
      referenceName: { $in: wits.map(t => t.type) },
    },
    { name: 1, icon: 1, fields: 1 }
  ).lean();

  return (
    workItemTypes
      // Sort by the sequence of work item types in the config
      .sort(asc(byNum(wit => wits.map(prop('type')).indexOf(wit.name))))
      .map(wit => {
        const matchingWitConfig = wits.find(w => w.type === wit.name);
        const fields = (fieldNames?: string[]) =>
          fieldNames
            ?.map(field => wit.fields.find(f => f.referenceName === field)?.name)
            .filter(exists);

        return {
          name: [wit.name, pluralize(wit.name)],
          icon: `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg(wit.icon))}`,
          startDateFields: fields(matchingWitConfig?.startDate),
          endDateFields: fields(matchingWitConfig?.endDate),
          devCompleteFields: fields(matchingWitConfig?.devCompletionDate),
          groupLabel:
            matchingWitConfig?.groupLabel ??
            (matchingWitConfig?.groupByField
              ? fields([matchingWitConfig.groupByField])?.[0]
              : undefined),
          workCenters: (matchingWitConfig?.workCenters || []).map(wc => ({
            label: wc.label,
            startDateFields: fields(wc.startDate),
            endDateFields: fields(wc.endDate),
          })),
          rootCauseFields: fields(matchingWitConfig?.rootCause),
        };
      })
  );
};

export type UIWorkItemType = Awaited<ReturnType<typeof getWorkItemTypes>>[number];
