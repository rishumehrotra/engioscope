import { collectionsAndProjects, getConfig } from '../config.js';
import type { WorkItemType } from '../models/mongoose-models/WorkItemType.js';
import { WorkItemTypeModel } from '../models/mongoose-models/WorkItemType.js';
import azure from '../scraper/network/azure.js';
import type { WorkItemType as AzureWorkItemType } from '../scraper/types-azure.js';

const apiShapeToModelShape = (
  collectionName: string,
  project: string,
  workItemType: AzureWorkItemType
): WorkItemType => ({
  collectionName,
  project,
  name: workItemType.name,
  referenceName: workItemType.referenceName,
  description: workItemType.description,
  icon: workItemType.icon,
  fields: workItemType.fields,
  transitions: workItemType.transitions,
  states: workItemType.states,
});

export const bulkUpsertWorkItemTypes =
  (collectionName: string, project: string) => (workItemTypes: AzureWorkItemType[]) =>
    WorkItemTypeModel.bulkWrite(
      workItemTypes.map(workItemType => ({
        updateOne: {
          filter: { collectionName, project, referenceName: workItemType.referenceName },
          update: { $set: apiShapeToModelShape(collectionName, project, workItemType) },
          upsert: true,
        },
      }))
    );

export const getWorkItemTypes = () => {
  const { getWorkItemTypes } = azure(getConfig());

  return Promise.all(
    collectionsAndProjects().map(([collection, project]) =>
      getWorkItemTypes(collection.name, project.name).then(
        bulkUpsertWorkItemTypes(collection.name, project.name)
      )
    )
  );
};
