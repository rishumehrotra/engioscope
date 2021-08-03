import React from 'react';
import { ProjectWorkItemAnalysis } from '../../shared/types';
import WorkItemsGnattChart from '../components/WorkItemsGnattChart';
import { mediumDate } from '../helpers';

const WorkItems: React.FC<{ workItemAnalysis: ProjectWorkItemAnalysis | undefined }> = ({ workItemAnalysis }) => (
  workItemAnalysis ? (
    <div>
      Tasks named
      {' '}
      "
      {workItemAnalysis.taskType}
      " -
      {' '}
      {workItemAnalysis.workItems?.length}
      <ul>
        {workItemAnalysis.workItems?.map(workItem => (
          <li key={workItem.source.id}>
            <h3>
              <a href={workItem.source.url} className="text-blue-600" target="_blank" rel="noreferrer">
                {workItem.source.title}
              </a>
            </h3>
            <dl>
              <dt>
                Started on
              </dt>
              <dd>
                {mediumDate(new Date(workItem.source.revisions[0].date))}
              </dd>
              <dt>
                Last update
              </dt>
              <dd>
                {mediumDate(new Date(workItem.source.revisions[workItem.source.revisions.length - 1].date))}
              </dd>
              <dt>
                Children count
              </dt>
              <dd>
                {workItem.targets.length}
              </dd>
            </dl>
            <WorkItemsGnattChart workItem={workItem} />
          </li>
        ))}
      </ul>
    </div>
  ) : (<div>Loading...</div>)
);

export default WorkItems;
