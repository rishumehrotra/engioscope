type Tree<T> = T & { children?: Tree<T>[] };

export const reduceTree =
  <T, U>(reducer: (acc: U, node: Tree<T>) => U) =>
  (init: U, tree: Tree<T>): U => {
    const acc = reducer(init, tree);
    if (!tree.children) return acc;
    return tree.children.reduce(reduceTree(reducer), acc);
  };

export const mapTree =
  <T, U>(mapper: (node: Tree<T>) => Tree<U>) =>
  (tree: Tree<T>): Tree<U> => {
    const mapped = mapper(tree);
    if (!tree.children) return mapped;
    const children = tree.children.map(mapTree(mapper));
    return { ...mapped, children };
  };

/**
 * Returns a tree. The following logic is used.
 *  * Does a depth-first traversal of the tree.
 *  * If the predicate returns true, the node is returned without looking at its children
 *  * If the predicate returns false, its children are searched recursively with the predicate
 *  * If some child matches the predicate but its siblings don't match, only the child is considered
 *  * If a child matches, all its ancestors, not including ancestor siblings, are returned
 *  * If nothing matches, null is returned
 */
export const filterTree =
  <T>(predicate: (node: Tree<T>) => boolean) =>
  (tree: Tree<T>): Tree<T> | null => {
    if (predicate(tree)) return tree;
    if (!tree.children || tree.children.length === 0) return null;

    const filtered = tree.children.map(filterTree(predicate)).filter(x => x !== null);

    if (filtered.length === 0) return null;
    return { ...tree, children: filtered } as Tree<T>;
  };
