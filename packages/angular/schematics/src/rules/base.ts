/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {callRule, callSource} from './call';
import {MergeStrategy, FilePredicate} from '../tree/interface';
import {Rule, SchematicContext, Source} from '../engine/interface';
import {VirtualTree} from '../tree/virtual';
import {FilteredTree} from '../tree/filtered';
import {Tree} from '../tree/interface';
import {empty as staticEmpty} from '../tree/static';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';


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
 * Merge multiple sources' output.
 */
export function mergeSources(sources: Source[],
                             strategy: MergeStrategy = MergeStrategy.Default): Source {
  return apply(empty(), [merge(sources, strategy)]);
}


/**
 *
 * @param sources
 * @param strategy
 * @return {(tree:Tree, context:SchematicContext)=>Observable<Tree>}
 */
export function merge(sources: Source[], strategy: MergeStrategy = MergeStrategy.Default): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return sources.reduce((acc: Observable<Tree>, curr: Source) => {
      const result = callSource(curr, context);
      return acc.concatMap(x => {
        return result.map(y => VirtualTree.merge(x, y, strategy || context.strategy));
      });
    }, Observable.of<Tree>(tree));
  };
}


export function noop(): Rule {
  return (tree: Tree, _context: SchematicContext) => tree;
}


export function filter(predicate: FilePredicate<boolean>): Rule {
  return (tree: Tree) => new FilteredTree(tree, predicate);
}
