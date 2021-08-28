import { last } from 'rambda';
import {
  useCallback, useEffect, useMemo, useState
} from 'react';
import type { AnalysedWorkItems, UIWorkItem } from '../../../shared/types';
import { exists } from '../../helpers/utils';
import { useProjectDetails } from '../../hooks/project-details-hooks';
import { filterTree, mapTree } from './tree-traversal';
import type { ExpandedState } from './types';

type NodeCommonProps = {
  path: string;
  type: 'workitem' | 'workitem-type' | 'workitem-environment' | 'project';
  depth: number;
  label: string;
  expandedState: ExpandedState;
};
type WorkItemNode = Omit<NodeCommonProps, 'label'> & {
  type: 'workitem';
  workItem: UIWorkItem;
  children: WorkItemTypeNode[];
  expandedState: ExpandedState;
};
type WorkItemTypeNode = NodeCommonProps & {
  type: 'workitem-type';
  children: (WorkItemNode | EnvironmentGroupNode)[];
  expandedState: Exclude<ExpandedState, 'no-children'>;
};

type EnvironmentGroupNode = NodeCommonProps & {
  type: 'workitem-environment';
  children: WorkItemNode[];
  expandedState: Exclude<ExpandedState, 'no-children'>;
};

type ProjectNode = NodeCommonProps & {
  type: 'project';
  expandedState: Exclude<ExpandedState, 'no-children'>;
  children: TreeNode[];
};

export type TreeNode = WorkItemNode | WorkItemTypeNode | EnvironmentGroupNode | ProjectNode;

type WithoutChildren<T extends TreeNode> = Omit<T, 'children'>;

export const constructTree = (
  workItemsIdTree: AnalysedWorkItems['ids'],
  workItemsById: AnalysedWorkItems['byId']
) => {
  const buildForAncestor = (ancestors: WithoutChildren<WorkItemNode>[]): WorkItemNode['children'] => {
    const parent = last(ancestors);

    const groupedByWorkItemType = (workItemsIdTree[parent.workItem.id] || [])
      .filter(workItemId => ancestors.every(a => a.workItem.id !== workItemId))
      .map(id => workItemsById[id])
      .reduce<Record<string, UIWorkItem[]>>((acc, workItem) => ({
        ...acc,
        [workItem.type]: [...(acc[workItem.type] || []), workItem]
      }), {});

    return Object.entries(groupedByWorkItemType).map<WorkItemTypeNode>(([workItemType, workItems]) => {
      const groupedByEnvironment = workItems.reduce<Record<string, UIWorkItem[]>>((acc, workItem) => ({
        ...acc,
        [workItem.env || 'no-environment']: [...(acc[workItem.env || 'no-environment'] || []), workItem]
      }), {});

      const nodesByEnvironment = Object.entries(groupedByEnvironment)
        .map<EnvironmentGroupNode>(([environmentName, workItems]) => ({
          type: 'workitem-environment',
          label: environmentName,
          path: `${parent.path}/${workItemType}/${environmentName}`,
          expandedState: 'collapsed',
          depth: parent.depth + 2,
          children: workItems
            .filter(wi => ancestors.every(a => a.workItem.id !== wi.id))
            .map<WorkItemNode>(workItem => {
              const workItemNode: WithoutChildren<WorkItemNode> = {
                type: 'workitem',
                workItem,
                path: `${parent.path}/${workItemType}/${environmentName}/${workItem.id}`.replace('no-environment/', ''),
                expandedState: 'collapsed',
                depth: parent.depth + 3
              };

              return {
                ...workItemNode,
                expandedState: (workItemsIdTree[workItem.id] || []).length === 0 ? 'no-children' : 'collapsed',
                children: buildForAncestor([...ancestors, workItemNode])
              };
            })
        }));

      const envs = Object.keys(groupedByEnvironment);

      return ({
        type: 'workitem-type',
        label: workItemType,
        path: `${parent.path}/${workItemType}`,
        expandedState: 'collapsed',
        depth: parent.depth + 1,
        children: (envs.length === 1 && envs[0] === 'no-environment')
          ? nodesByEnvironment[0].children.map(c => ({ ...c, depth: c.depth - 1 }))
          : nodesByEnvironment
      });
    });
  };

  return (workItemId: number, projectName: string) => {
    const rootWorkItemNodeWoc: WithoutChildren<WorkItemNode> = {
      workItem: workItemsById[workItemId],
      type: 'workitem',
      path: '',
      expandedState: 'expanded',
      depth: 0
    };

    const fullTree = buildForAncestor([rootWorkItemNodeWoc]);

    const projectNode: ProjectNode = {
      type: 'project',
      label: projectName,
      path: '/own-project',
      depth: 0,
      expandedState: 'expanded',
      children: fullTree.map(filterTree<TreeNode>(node => (
        node.type === 'workitem'
        && node.workItem.project === projectName
      )))
        .filter(exists)
        .map(mapTree(node => ({
          ...node, path: `/own-project${node.path}`
        })))
    };

    const allProjectsNode: ProjectNode = {
      type: 'project',
      label: 'All projects',
      path: '/all-projects',
      depth: 0,
      expandedState: 'collapsed',
      children: fullTree
        .map(mapTree<TreeNode, TreeNode>(node => ({
          ...node, path: `/all-projects${node.path}`
        })))
    };
    return [projectNode, allProjectsNode];
  };
};

const toggleExpandState = (path: string) => (node: (TreeNode | ProjectNode)): (TreeNode | ProjectNode) => {
  if (node.path === path) {
    if (node.expandedState === 'no-children') return node;

    return { ...node, expandedState: node.expandedState === 'collapsed' ? 'expanded' : 'collapsed' };
  }

  if (path.startsWith(node.path)) {
    return {
      ...node,
      children: node.children.map(toggleExpandState(path))
    } as unknown as TreeNode;
  }

  return node;
};

export type Row = (
  Omit<TreeNode, 'children'>
  | Omit<ProjectNode, 'children'>
) & { childCount: number };

export const isWorkItemRow = (row: Row): row is Omit<WorkItemNode, 'children'> & { childCount: number } => (
  row.type === 'workitem'
);

export const isNotWorkItemRow = (row: Row): row is Omit<NodeCommonProps, 'children'> & { childCount: number } => (
  row.type !== 'workitem'
);

const rowsToRender = (rootNodes: (ProjectNode | TreeNode)[]) => {
  const flattenChildren = (node: TreeNode): Row[] => {
    const { children, ...nodeWithoutChildren } = node;

    return [
      { ...nodeWithoutChildren, childCount: children.length },
      ...(node.expandedState === 'expanded' ? node.children : []).flatMap(flattenChildren)
    ];
  };

  return rootNodes.flatMap(x => flattenChildren(x as TreeNode));
};

const useGanttRows = (
  workItemsIdTree: AnalysedWorkItems['ids'],
  workItemsById: AnalysedWorkItems['byId'],
  workItemId: number
) => {
  const projectDetails = useProjectDetails();
  const projectName = projectDetails?.name[1];

  const [tree, setTree] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (projectName) {
      setTree(constructTree(workItemsIdTree, workItemsById)(workItemId, projectName));
    }
  }, [projectName, workItemId, workItemsById, workItemsIdTree]);

  const rows = useMemo(() => rowsToRender(tree), [tree]);
  const toggleRow = useCallback((rowPath: string) => {
    setTree(tree => tree.map(toggleExpandState(rowPath)));
  }, []);

  return [rows, toggleRow] as const;
};

export default useGanttRows;
