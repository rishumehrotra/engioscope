import { last } from 'rambda';
import type { UIWorkItemRevision } from '../../../shared/types.js';
import type { WorkItem } from '../types-azure.js';

const transformRevision = (revision: WorkItem): UIWorkItemRevision => ({
  state: revision.fields['System.State'],
  date: revision.fields['System.ChangedDate'].toISOString(),
});
export default (revisions: WorkItem[]) =>
  revisions.reduce<UIWorkItemRevision[]>((acc, revision) => {
    if (acc.length === 0) {
      return [transformRevision(revision)];
    }

    if (last(acc)?.state === revision.fields['System.State']) {
      return acc;
    }

    return acc.concat(transformRevision(revision));
  }, []);
