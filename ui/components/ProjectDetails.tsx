import React from 'react';
import { useParams } from 'react-router-dom';
import { useProjectDetails } from '../hooks/project-details-hooks';
import usePageName from '../hooks/use-page-name';

const renderIfAvailable = (count: number | undefined, label: string) => (count ? (
  <>
    <span className="font-bold text-lg">{count}</span>
    {' '}
    <span>{label}</span>
  </>
) : '');

export const ProjectDetails: React.FC = () => {
  const projectDetails = useProjectDetails();
  const pageName = usePageName();
  const { project: projectName } = useParams<{ project: string }>();

  const project = projectDetails?.name[1] === projectName ? projectDetails : null;

  return (
    <div className="flex justify-between w-full col-span-2 items-end">
      <div>
        <h1 className="text-5xl font-bold text-gray-200 pr-2">
          {projectName || ' '}
        </h1>
        <div className="text-base mt-2 font-normal text-gray-200">
          {project ? (
            <>
              {renderIfAvailable(project.reposCount, pageName('repos', project.reposCount))}
              {project.releasePipelineCount ? ' | ' : ''}
              {renderIfAvailable(project.releasePipelineCount, pageName('release-pipelines', project.releasePipelineCount))}
              {project.workItemCount ? ' | ' : ''}
              {renderIfAvailable(project.workItemCount, pageName('workitems', project.workItemCount))}
            </>
          ) : <span className="font-bold text-lg">&nbsp;</span>}
        </div>
      </div>
      <p className="text-sm text-gray-300 mt-2 flex items-center">
        {project ? (
          <>
            Last updated on
            <span className="font-semibold text-gray-400 ml-1">
              {project ? project.lastUpdated : '...'}
            </span>
          </>
        ) : <span>&nbsp;</span>}
      </p>
    </div>
  );
};
