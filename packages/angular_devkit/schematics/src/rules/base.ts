/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import { FileOperator, Rule, SchematicContext, Source } from '../engine/interface';
import { FilteredTree } from '../tree/filtered';
import { FileEntry, FilePredicate, MergeStrategy, Tree } from '../tree/interface';
import {
  branch,
  empty as staticEmpty,
  merge as staticMerge,
  partition as staticPartition,
} from '../tree/static';
import { VirtualTree } from '../tree/virtual';
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
  return (tree: Tree, context: SchematicContext) => {
    return rules.reduce((acc: Observable<Tree>, curr: Rule) => {
      return callRule(curr, acc, context);
    }, Observable.of(tree));
  };
}


/**
 * Apply multiple rules to a source, and returns the source transformed.
 */
export function apply(source: Source, rules: Rule[]): Source {
  return (context: SchematicContext) => {
    return callRule(chain(rules), callSource(source, context), context);
  };
}


/**
 * Merge an input tree with the source passed in.
 */
export function mergeWith(source: Source, strategy: MergeStrategy = MergeStrategy.Default): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const result = callSource(source, context);

    return result.map(other => VirtualTree.merge(tree, other, strategy || context.strategy));
  };
}


export function noop(): Rule {
  return (tree: Tree, _context: SchematicContext) => tree;
}


export function filter(predicate: FilePredicate<boolean>): Rule {
  return (tree: Tree) => new FilteredTree(tree, predicate);
}


export function asSource(rule: Rule): Source {
  return apply(empty(), [rule]);
}


export function branchAndMerge(rule: Rule): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const branchedTree = branch(tree);

    return callRule(rule, Observable.of(branchedTree), context)
      .map(t => staticMerge(tree, t));
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
  return (tree: Tree, context: SchematicContext) => {
    const [yes, no] = staticPartition(tree, predicate);

    if (!ruleNo) {
      // Shortcut.
      return callRule(ruleYes, Observable.of(staticPartition(tree, predicate)[0]), context)
        .map(yesTree => staticMerge(yesTree, no, context.strategy));
    }

    return callRule(ruleYes, Observable.of(yes), context)
      .concatMap(yesTree => {
        return callRule(ruleNo, Observable.of(no), context)
          .map(noTree => staticMerge(yesTree, noTree, context.strategy));
      });
  };
}


export function forEach(operator: FileOperator): Rule {
  return (tree: Tree) => {
    tree.files.forEach(path => {
      const entry = tree.get(path);
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

    return tree;
  };
}
