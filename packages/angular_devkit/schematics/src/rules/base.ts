/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { FileOperator, Rule, Source } from '../engine/interface';
import { SchematicsException } from '../exception/exception';
import { FilterHostTree, HostTree } from '../tree/host-tree';
import { FileEntry, FilePredicate, MergeStrategy, Tree } from '../tree/interface';
import { ScopedTree } from '../tree/scoped';
import { partition, empty as staticEmpty } from '../tree/static';
import { callRule, callSource } from './call';

/**
 * A Source that returns an tree as its single value.
 */
export function source(tree: Tree): Source {
  return () => tree;
}

/**
 * A source that returns an empty tree.
 */
export function empty(): Source {
  return () => staticEmpty();
}

/**
 * Chain multiple rules into a single rule.
 */
export function chain(rules: Iterable<Rule> | AsyncIterable<Rule>): Rule {
  return async (initialTree, context) => {
    let intermediateTree: Tree | undefined;
    for await (const rule of rules) {
      intermediateTree = await callRule(rule, intermediateTree ?? initialTree, context);
    }

    return () => intermediateTree;
  };
}

/**
 * Apply multiple rules to a source, and returns the source transformed.
 */
export function apply(source: Source, rules: Rule[]): Source {
  return async (context) => callRule(chain(rules), await callSource(source, context), context);
}

/**
 * Merge an input tree with the source passed in.
 */
export function mergeWith(source: Source, strategy: MergeStrategy = MergeStrategy.Default): Rule {
  return async (tree, context) => {
    const sourceTree = await callSource(source, context);
    tree.merge(sourceTree, strategy || context.strategy);
  };
}

export function noop(): Rule {
  return () => {};
}

export function filter(predicate: FilePredicate<boolean>): Rule {
  return (tree: Tree) => {
    if (HostTree.isHostTree(tree)) {
      return new FilterHostTree(tree, predicate);
    } else {
      throw new SchematicsException('Tree type is not supported.');
    }
  };
}

export function asSource(rule: Rule): Source {
  return (context) => callRule(rule, staticEmpty(), context);
}

export function branchAndMerge(rule: Rule, strategy = MergeStrategy.Default): Rule {
  return async (tree, context) => {
    const branch = await callRule(rule, tree.branch(), context);
    tree.merge(branch, strategy || context.strategy);
  };
}

export function when(predicate: FilePredicate<boolean>, operator: FileOperator): FileOperator {
  return (entry: FileEntry) => {
    if (predicate(entry.path, entry)) {
      return operator(entry);
    } else {
      return entry;
    }
  };
}

export function partitionApplyMerge(
  predicate: FilePredicate<boolean>,
  ruleYes: Rule,
  ruleNo?: Rule,
): Rule {
  return async (tree, context) => {
    const [yes, no] = partition(tree, predicate);
    const [yesTree, noTree] = await Promise.all([
      callRule(ruleYes, yes, context),
      callRule(ruleNo || noop(), no, context),
    ]);

    yesTree.merge(noTree, context.strategy);

    return yesTree;
  };
}

export function forEach(operator: FileOperator): Rule {
  return (tree: Tree) => {
    tree.visit((path, entry) => {
      if (!entry) {
        return;
      }
      const newEntry = operator(entry);
      if (newEntry === entry) {
        return;
      }
      if (newEntry === null) {
        tree.delete(path);

        return;
      }
      if (newEntry.path != path) {
        tree.rename(path, newEntry.path);
      }
      if (!newEntry.content.equals(entry.content)) {
        tree.overwrite(newEntry.path, newEntry.content);
      }
    });
  };
}

export function composeFileOperators(operators: FileOperator[]): FileOperator {
  return (entry: FileEntry) => {
    let current: FileEntry | null = entry;
    for (const op of operators) {
      current = op(current);

      if (current === null) {
        // Deleted, just return.
        return null;
      }
    }

    return current;
  };
}

export function applyToSubtree(path: string, rules: Rule[]): Rule {
  return async (tree, context) => {
    const scoped = new ScopedTree(tree, path);
    const result = await callRule(chain(rules), scoped, context);

    if (result === scoped) {
      return tree;
    }
    throw new SchematicsException(
      'Original tree must be returned from all rules when using "applyToSubtree".',
    );
  };
}
