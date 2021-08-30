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
  children: (WorkItemNode | WorkItemEnvironmentNode)[];
  expandedState: Exclude<ExpandedState, 'no-children'>;
  color: string;
  icon: string;
  childCount: number;
};

type WorkItemEnvironmentNode = NodeCommonProps & {
  type: 'workitem-environment';
  children: WorkItemNode[];
  expandedState: Exclude<ExpandedState, 'no-children'>;
  childCount: number;
  color: string;
  icon: string;
};

type ProjectNode = NodeCommonProps & {
  type: 'project';
  expandedState: Exclude<ExpandedState, 'no-children'>;
  children: TreeNode[];
  childCount: number;
};

const isWorkItemEnvironmentNode = (node: TreeNode): node is WorkItemEnvironmentNode => (
  node.type === 'workitem-environment'
);

export type TreeNode = WorkItemNode | WorkItemTypeNode | WorkItemEnvironmentNode | ProjectNode;

type WithoutChildren<T extends TreeNode> = Omit<T, 'children'>;

const recomupteChildCounts = (node: ProjectNode): ProjectNode => {
  const children = (
    node.children.map<WorkItemTypeNode>(workItemTypeNode => {
      const children = (
        workItemTypeNode.children.map<WorkItemTypeNode['children'][number]>(workItemOrEnvNode => {
          if (isWorkItemEnvironmentNode(workItemOrEnvNode)) {
            return {
              ...workItemOrEnvNode,
              childCount: workItemOrEnvNode.children.length
            };
          }

          return workItemOrEnvNode as WorkItemNode;
        })
      );

      return {
        ...workItemTypeNode,
        children,
        childCount: children.reduce((acc, node) => (
          acc + (isWorkItemEnvironmentNode(node) ? node.childCount : 1)
        ), 0)
      } as WorkItemTypeNode;
    })
  );

  return {
    ...node,
    children,
    childCount: children.reduce((acc, node) => acc + node.childCount, 0)
  };
};

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

    const uiElementsByWorkItemType = Object.entries(groupedByWorkItemType)
      .reduce<Record<string, Pick<WorkItemTypeNode, 'color' | 'icon'>>>((acc, [workItemType, workItems]) => ({
        ...acc,
        [workItemType]: {
          icon: workItems[0].icon,
          color: workItems[0].color
        }
      }), {});

    return Object.entries(groupedByWorkItemType).map<WorkItemTypeNode>(([workItemType, workItems]) => {
      const groupedByEnvironment = workItems.reduce<Record<string, UIWorkItem[]>>((acc, workItem) => ({
        ...acc,
        [workItem.env || 'no-environment']: [...(acc[workItem.env || 'no-environment'] || []), workItem]
      }), {});

      const nodesByEnvironment = Object.entries(groupedByEnvironment)
        .map<WorkItemEnvironmentNode>(([environmentName, workItems]) => {
          const children = workItems
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
            });

          return ({
            type: 'workitem-environment',
            label: environmentName,
            path: `${parent.path}/${workItemType}/${environmentName}`,
            expandedState: 'collapsed',
            depth: parent.depth + 2,
            children,
            childCount: children.length,
            icon: workItems[0].icon,
            color: workItems[0].color
          });
        });

      const envs = Object.keys(groupedByEnvironment);

      return {
        type: 'workitem-type',
        label: workItemType,
        path: `${parent.path}/${workItemType}`,
        expandedState: 'collapsed',
        depth: parent.depth + 1,
        children: (envs.length === 1 && envs[0] === 'no-environment')
          ? nodesByEnvironment[0].children.map(c => ({ ...c, depth: c.depth - 1 }))
          : nodesByEnvironment,
        ...uiElementsByWorkItemType[workItemType],
        childCount: Object.values(nodesByEnvironment)
          .reduce((acc, n) => acc + n.childCount, 0)
      };
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

    const projectNode = recomupteChildCounts({
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
        }))),
      childCount: 0
    });

    const allProjectsNode: ProjectNode = {
      type: 'project',
      label: 'All projects',
      path: '/all-projects',
      depth: 0,
      expandedState: 'collapsed',
      children: fullTree
        .map(mapTree<TreeNode, TreeNode>(node => ({
          ...node, path: `/all-projects${node.path}`
        }))),
      childCount: fullTree.reduce((acc, n) => acc + n.childCount, 0)
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
);

export const isWorkItemRow = (row: Row): row is Omit<WorkItemNode, 'children'> & { childCount: number } => (
  row.type === 'workitem'
);

export const isWorkItemTypeRow = (row: Row): row is Omit<WorkItemTypeNode, 'children'> & { childCount: number } => (
  row.type === 'workitem-type'
);

export const isWorkItemEnvironmentRow = (row: Row): row is Omit<WorkItemEnvironmentNode, 'children'> & { childCount: number } => (
  row.type === 'workitem-environment'
);

export const isNotWorkItemRow = (row: Row): row is Omit<NodeCommonProps, 'children'> & { childCount: number } => (
  row.type !== 'workitem'
);

const rowsToRender = (rootNodes: (ProjectNode | TreeNode)[]) => {
  const flattenChildren = (node: TreeNode): Row[] => [
    node,
    ...(node.expandedState === 'expanded' ? node.children : []).flatMap(flattenChildren)
  ];

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
