import { Config } from './types';
import { pastDate } from '../utils';

export const dayInMs = 24 * 60 * 60 * 1000;

export const queryForTopLevelWorkItems = (config: Config) => {
  const daysToLookup = Math.round(
    (Date.now() - pastDate(config.azure.lookAtPast).getTime()) / dayInMs
  );

  return `
    SELECT [Id]
    FROM workitemLinks
    WHERE 
      [Source].[System.TeamProject] = @project
      AND [Source].[System.WorkItemType] = '${config.azure.groupWorkItemsUnder}'
      AND [Source].[System.ChangedDate] >= @today-${daysToLookup}
    ORDER BY [Source].[System.CreatedDate] ASC
  `;
};

export const queryForAllBugsAndFeatures = `
  SELECT [System.Id]
  FROM workitemLinks
  WHERE
    [Source].[System.WorkItemType] IN ('Feature', 'Bug')
    AND (
      [System.Links.LinkType] = 'Microsoft.VSTS.Common.Affects-Reverse'
      OR [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
      OR [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Reverse'
      OR [System.Links.LinkType] = 'Microsoft.VSTS.TestCase.SharedParameterReferencedBy-Forward'
      OR [System.Links.LinkType] = 'System.LinkTypes.Related-Forward'
    )
  ORDER BY [System.CreatedDate] ASC
  MODE (MayContain)
`;
