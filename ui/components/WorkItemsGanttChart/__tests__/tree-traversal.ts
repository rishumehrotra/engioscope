import { it, expect } from 'vitest';
import { filterTree, reduceTree } from '../tree-traversal.js';

const tree = {
  id: 'root',
  children: [
    {
      id: 'child1',
      children: [
        { id: 'grandchild1', children: [] },
        { id: 'grandchild2', children: [] },
      ],
    },
    { id: 'child2', children: [] },
  ],
};

it('should reduce a tree', () => {
  const reduced = reduceTree<{ id: string }, string[]>((acc, node) => {
    acc.push(node.id);
    return acc;
  })([], tree);

  expect(reduced).toEqual(['root', 'child1', 'grandchild1', 'grandchild2', 'child2']);
});

it('should filter a tree', () => {
  expect(filterTree<{ id: string }>(node => node.id === 'child1')(tree)).toEqual({
    id: 'root',
    children: [
      {
        id: 'child1',
        children: [
          { id: 'grandchild1', children: [] },
          { id: 'grandchild2', children: [] },
        ],
      },
    ],
  });

  expect(filterTree<{ id: string }>(node => node.id === 'grandchild1')(tree)).toEqual({
    id: 'root',
    children: [
      {
        id: 'child1',
        children: [{ id: 'grandchild1', children: [] }],
      },
    ],
  });

  expect(filterTree<{ id: string }>(node => node.id === 'root')(tree)).toEqual(tree);
});
