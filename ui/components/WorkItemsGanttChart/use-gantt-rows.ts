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
  workItemIds: number[];
  minTimestamp: number;
  maxTimestamp: number;
};

type WorkItemEnvironmentNode = NodeCommonProps & {
  type: 'workitem-environment';
  children: WorkItemNode[];
  expandedState: Exclude<ExpandedState, 'no-children'>;
  childCount: number;
  color: string;
  icon: string;
  workItemIds: number[];
  minTimestamp: number;
  maxTimestamp: number;
};

type ProjectNode = NodeCommonProps & {
  type: 'project';
  expandedState: Exclude<ExpandedState, 'no-children'>;
  children: WorkItemTypeNode[];
  childCount: number;
  minTimestamp: number;
  maxTimestamp: number;
};

const isWorkItemNode = (node: TreeNode): node is WorkItemNode => (
  node.type === 'workitem'
);

const isWorkItemEnvironmentNode = (node: TreeNode): node is WorkItemEnvironmentNode => (
  node.type === 'workitem-environment'
);

export type TreeNode = WorkItemNode | WorkItemTypeNode | WorkItemEnvironmentNode | ProjectNode;

type WithoutChildren<T extends TreeNode> = Omit<T, 'children'>;

const wid = (x: WorkItemNode | WithoutChildren<WorkItemNode>) => x.workItem.id;

const recomputeDerivedValues = (node: ProjectNode): ProjectNode => {
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
        workItemIds: children.flatMap(c => (
          isWorkItemNode(c) ? [wid(c)] : []
        )),
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

const isInAncestors = (ancestors: WithoutChildren<WorkItemNode>[]) => (
  (workItemId: number) => ancestors.every(a => wid(a) !== workItemId)
);

const groupByWorkItemType = (workItemById: (id: number) => UIWorkItem) => (
  (ancestors: WithoutChildren<WorkItemNode>[], workItemIds: number[] | undefined) => (
    (workItemIds || [])
      .filter(isInAncestors(ancestors))
      .map(workItemById)
      .reduce<Record<string, UIWorkItem[]>>((acc, workItem) => ({
        ...acc,
        [workItem.type]: [...(acc[workItem.type] || []), workItem]
      }), {})
  )
);

export const constructTree = (
  workItemsIdTree: AnalysedWorkItems['ids'],
  workItemsById: AnalysedWorkItems['byId']
) => {
  const workItemById = (id: number) => workItemsById[id];
  const childIdsOf = (workItemId: number) => workItemsIdTree[workItemId];
  const byWorkItemType = groupByWorkItemType(workItemById);

  const buildForAncestor = (ancestors: WithoutChildren<WorkItemNode>[]): WorkItemNode['children'] => {
    const parent = last(ancestors);

    const groupedByWorkItemType = byWorkItemType(
      ancestors, childIdsOf(wid(parent))
    );

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
            .filter(wi => ancestors.every(a => wid(a) !== wi.id))
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
                expandedState: (childIdsOf(workItem.id) || []).length === 0 ? 'no-children' : 'collapsed',
                children: buildForAncestor([...ancestors, workItemNode])
              };
            });

          return {
            type: 'workitem-environment',
            label: environmentName,
            path: `${parent.path}/${workItemType}/${environmentName}`,
            expandedState: 'collapsed',
            depth: parent.depth + 2,
            children,
            childCount: children.length,
            icon: workItems[0].icon,
            color: workItems[0].color,
            minTimestamp: Math.min(...workItems.map(wi => new Date(wi.created.on).getTime())),
            maxTimestamp: Math.max(...workItems.map(wi => new Date(wi.updated.on).getTime())),
            workItemIds: workItems.map(wi => wi.id)
          };
        });

      const envs = Object.keys(groupedByEnvironment);

      const children: (WorkItemEnvironmentNode | WorkItemNode)[] = (
        (envs.length === 1 && envs[0] === 'no-environment')
          ? nodesByEnvironment[0].children.map<WorkItemNode>(c => ({ ...c, depth: c.depth - 1 }))
          : nodesByEnvironment
      );

      return {
        type: 'workitem-type',
        label: workItemType,
        path: `${parent.path}/${workItemType}`,
        expandedState: 'collapsed',
        depth: parent.depth + 1,
        children,
        workItemIds: children.filter(isWorkItemNode).map(wid),
        childCount: Object.values(nodesByEnvironment)
          .reduce((acc, n) => acc + n.childCount, 0),
        minTimestamp: Math.min(...workItems.map(wi => new Date(wi.created.on).getTime())),
        maxTimestamp: Math.max(...workItems.map(wi => new Date(wi.updated.on).getTime())),
        ...uiElementsByWorkItemType[workItemType]
      };
    });
  };

  return (workItemId: number, projectName: string) => {
    const fullTree = buildForAncestor([{
      workItem: workItemById(workItemId),
      type: 'workitem',
      path: '',
      expandedState: 'expanded',
      depth: 0
    }]);

    const ownProjectChildren = fullTree.map(filterTree<TreeNode>(node => (
      isWorkItemNode(node) && node.workItem.project === projectName
    )))
      .filter(exists)
      .map(mapTree(node => ({
        ...node, path: `/own-project${node.path}`
      }))) as WorkItemTypeNode[];

    const projectNode = recomputeDerivedValues({
      type: 'project',
      label: projectName,
      path: '/own-project',
      depth: 0,
      expandedState: 'expanded',
      children: ownProjectChildren,
      childCount: 0,
      minTimestamp: Math.min(...fullTree.map(c => c.minTimestamp)),
      maxTimestamp: Math.max(...fullTree.map(c => c.maxTimestamp))
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
        }))) as WorkItemTypeNode[],
      childCount: fullTree.reduce((acc, n) => acc + n.childCount, 0),
      minTimestamp: Math.min(...fullTree.map(c => c.minTimestamp)),
      maxTimestamp: Math.max(...fullTree.map(c => c.maxTimestamp))
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
  Omit<WorkItemNode, 'children'>
  | Omit<WorkItemTypeNode, 'children'>
  | Omit<WorkItemEnvironmentNode, 'children'>
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

export const isProjectRow = (row: Row): row is Omit<ProjectNode, 'childrne'> & {childCount: number} => (
  row.type === 'project'
);

const rowsToRender = (rootNodes: (ProjectNode | TreeNode)[]) => {
  const flattenChildren = (node: TreeNode): Row[] => [
    node,
    ...(node.expandedState === 'expanded' ? node.children : []).flatMap(flattenChildren)
  ];

  return rootNodes.flatMap(flattenChildren);
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
    if (!projectName) return;
    setTree(constructTree(workItemsIdTree, workItemsById)(workItemId, projectName));
  }, [projectName, workItemId, workItemsById, workItemsIdTree]);

  const rows = useMemo(() => rowsToRender(tree), [tree]);
  const toggleRow = useCallback((rowPath: string) => {
    setTree(tree => tree.map(toggleExpandState(rowPath)));
  }, []);

  return [rows, toggleRow] as const;
};

export default useGanttRows;
