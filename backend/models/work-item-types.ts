import { model, Schema } from 'mongoose';
import pluralize from 'pluralize';
import type { z } from 'zod';
import { asc, byNum } from 'sort-lib';
import { prop } from 'rambda';
import { exists } from '../../shared/utils.js';
import { configForCollection } from '../config.js';
import type { WorkItemType as AzureWorkItemType } from '../scraper/types-azure.js';
import workItemIconSvgs from '../work-item-icon-svgs.js';
import type { collectionAndProjectInputParser } from './helpers.js';

export type WorkItemType = {
  collectionName: string;
  project: string;
  name: string;
  referenceName: string;
  description: string;
  icon: {
    id: keyof typeof workItemIconSvgs;
    url: string;
  };
  fields: {
    referenceName: string;
    name: string;
    helpText?: string;
  }[];
  transitions: Record<string, { to: string }[]>;
  states: {
    name: string;
    color: string;
    category: string;
  }[];
};

const workItemTypeSchema = new Schema<WorkItemType>({
  collectionName: { type: String, required: true },
  project: { type: String, required: true },
  name: { type: String, required: true },
  referenceName: { type: String, required: true },
  description: String,
  icon: {
    id: { type: String, required: true },
    url: { type: String, required: true }
  },
  fields: [{
    referenceName: { type: String, required: true },
    name: { type: String, required: true },
    helpText: String
  }],
  transitions: Schema.Types.Mixed,
  states: [{
    name: { type: String, required: true },
    color: { type: String, required: true },
    category: { type: String, required: true }
  }]
});

workItemTypeSchema.index({ collectionName: 1, project: 1, referenceName: 1 });

const WorkItemTypeModel = model<WorkItemType>('WorkItemType', workItemTypeSchema);

const apiShapeToModelShape = (collectionName: string, project: string, workItemType: AzureWorkItemType): WorkItemType => ({
  collectionName,
  project,
  name: workItemType.name,
  referenceName: workItemType.referenceName,
  description: workItemType.description,
  icon: workItemType.icon,
  fields: workItemType.fields,
  transitions: workItemType.transitions,
  states: workItemType.states
});

export const bulkUpsertWorkItemTypes = (collectionName: string, project: string) => (
  (workItemTypes: AzureWorkItemType[]) => (
    WorkItemTypeModel.bulkWrite(workItemTypes.map(workItemType => ({
      updateOne: {
        filter: { collectionName, project, referenceName: workItemType.referenceName },
        update: { $set: apiShapeToModelShape(collectionName, project, workItemType) },
        upsert: true
      }
    })))
  )
);

const iconSvg = ({ id, url }: WorkItemType['icon']) => {
  const { searchParams } = new URL(url);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return workItemIconSvgs[id](searchParams.get('color')!);
};

export const getWorkItemTypes = async ({ collectionName, project }: z.infer<typeof collectionAndProjectInputParser>) => {
  const collectionConfig = configForCollection(collectionName);
  const wits = collectionConfig?.workitems.types || [];

  const workItemTypes = await WorkItemTypeModel
    .find({
      collectionName,
      project,
      referenceName: { $in: wits.map(t => t.type) }
    }, { name: 1, icon: 1, fields: 1 })
    .lean();

  return workItemTypes
    // Sort by the sequence of work item types in the config
    .sort(asc(byNum(wit => wits.map(prop('type')).indexOf(wit.name))))
    .map(wit => {
      const matchingWitConfig = wits.find(w => w.type === wit.name);
      const fields = (fieldNames?: string[]) => (
        fieldNames
          ?.map(field => wit.fields.find(f => f.referenceName === field)?.name)
          .filter(exists)
      );

      return {
        name: [wit.name, pluralize(wit.name)],
        icon: `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg(wit.icon))}`,
        startDateFields: fields(matchingWitConfig?.startDate),
        endDateFields: fields(matchingWitConfig?.endDate),
        devCompleteFields: fields(matchingWitConfig?.devCompletionDate),
        groupLabel: matchingWitConfig?.groupLabel,
        workCenters: (matchingWitConfig?.workCenters || []).map(wc => ({
          label: wc.label,
          startDateFields: fields(wc.startDate),
          endDateFields: fields(wc.endDate)
        })),
        rootCauseFields: fields(matchingWitConfig?.rootCause)
      };
    });
};

export type UIWorkItemType = Awaited<ReturnType<typeof getWorkItemTypes>>[number];
