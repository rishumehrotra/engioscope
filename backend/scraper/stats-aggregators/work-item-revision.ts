import type { UIWorkItemRevision } from '../../../shared/types';
import type { WorkItemRevision } from '../types-azure';

const transformRevision = (revision: WorkItemRevision): UIWorkItemRevision => ({
  state: revision.fields['System.State'],
  date: revision.fields['System.ChangedDate'].toISOString()
});
export default (revisions: WorkItemRevision[]) => (
  revisions.reduce<UIWorkItemRevision[]>((acc, revision) => {
    if (acc.length === 0) {
      return [transformRevision(revision)];
    }

    if (acc[acc.length - 1].state === revision.fields['System.State']) {
      return acc;
    }

    return acc.concat(transformRevision(revision));
  }, [])
);
