/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, concat } from 'rxjs';
import { map, mapTo, toArray } from 'rxjs/operators';
import { FileOperator, Rule, Source } from '../engine/interface';
import { SchematicsException } from '../exception/exception';
import { FilterHostTree, HostTree } from '../tree/host-tree';
import { FileEntry, FilePredicate, MergeStrategy, Tree } from '../tree/interface';
import { ScopedTree } from '../tree/scoped';
import { empty as staticEmpty, partition } from '../tree/static';
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
export function chain(rules: Rule[]): Rule {
  return (tree, context) => {
    return rules.reduce(
      (acc: Tree | Observable<Tree>, curr: Rule) => callRule(curr, acc, context),
      tree,
    );
  };
}

/**
 * Apply multiple rules to a source, and returns the source transformed.
 */
export function apply(source: Source, rules: Rule[]): Source {
  return context => callRule(chain(rules), callSource(source, context), context);
}

/**
 * Merge an input tree with the source passed in.
 */
export function mergeWith(source: Source, strategy: MergeStrategy = MergeStrategy.Default): Rule {
  return (tree, context) => {
    return callSource(source, context).pipe(
      map(sourceTree => tree.merge(sourceTree, strategy || context.strategy)),
      mapTo(tree),
    );
  };
}

export function noop(): Rule {
  return () => {};
}

export function filter(predicate: FilePredicate<boolean>): Rule {
  return ((tree: Tree) => {
    if (HostTree.isHostTree(tree)) {
      return new FilterHostTree(tree, predicate);
    } else {
      throw new SchematicsException('Tree type is not supported.');
    }
  });
}

export function asSource(rule: Rule): Source {
  return context => callRule(rule, staticEmpty(), context);
}

export function branchAndMerge(rule: Rule, strategy = MergeStrategy.Default): Rule {
  return (tree, context) => {
    return callRule(rule, tree.branch(), context).pipe(
      map(branch => tree.merge(branch, strategy || context.strategy)),
      mapTo(tree),
    );
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
  return (tree, context) => {
    const [yes, no] = partition(tree, predicate);

    return concat(
      callRule(ruleYes, yes, context),
      callRule(ruleNo || noop(), no, context),
    ).pipe(
      toArray(),
      map(([yesTree, noTree]) => {
        yesTree.merge(noTree, context.strategy);

        return yesTree;
      }),
    );
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
  return (tree, context) => {
    const scoped = new ScopedTree(tree, path);

    return callRule(chain(rules), scoped, context).pipe(
      map(result => {
        if (result === scoped) {
          return tree;
        } else {
          throw new SchematicsException(
            'Original tree must be returned from all rules when using "applyToSubtree".',
          );
        }
      }),
    );
  };
}
