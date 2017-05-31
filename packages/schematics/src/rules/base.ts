/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {MergeStrategy, FilePredicate} from '../tree/interface';
import {Rule, SchematicContext, Source} from '../engine/interface';
import {BaseException} from '../exception/exception';
import {VirtualTree} from '../tree/virtual';
import {FilteredTree} from '../tree/filtered';
import {Tree} from '../tree/interface';
import {empty as staticEmpty} from '../tree/static';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';


export class InvalidRuleResultException extends BaseException {
  constructor(value: any) {
    let v = 'Unknown Type';
    if (value === undefined) {
      v = 'undefined';
    } else if (value === null) {
      v = 'null';
    } else if (typeof value == 'function') {
      v = `Function()`;
    } else if (typeof value != 'object') {
      v = `${typeof value}(${JSON.stringify(value)})`;
    } else {
      if (Object.getPrototypeOf(value) == Object) {
        v = `Object(${JSON.stringify(value)})`;
      } else if (value.constructor) {
        v = `Instance of class ${value.constructor.name}`;
      } else {
        v = 'Unknown Object';
      }
    }
    super(`Invalid rule or source result: ${v}.`);
  }
}


export function source(tree: Tree): Source {
  return () => tree;
}
export function empty(): Source {
  return () => staticEmpty();
}


export function callSource(source: Source, context: SchematicContext): Observable<Tree> {
  const result = source(context);

  if (result instanceof VirtualTree) {
    return Observable.of(result);
  } else if (result instanceof Observable) {
    return result;
  } else {
    throw new InvalidRuleResultException(result);
  }
}
export function callRule(rule: Rule,
                         input: Observable<Tree>,
                         context: SchematicContext): Observable<Tree> {
  return input.mergeMap(i => {
    const result = rule(i, context);

    if (result instanceof VirtualTree) {
      return Observable.of(result as Tree);
    } else if (result instanceof Observable) {
      return result;
    } else {
      throw new InvalidRuleResultException(result);
    }
  });
}


export function chain(rules: Rule[]): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return rules.reduce((acc: Observable<Tree>, curr: Rule) => {
      return callRule(curr, acc, context);
    }, Observable.of(tree));
  };
}


export function apply(source: Source, rules: Rule[]): Source {
  return (context: SchematicContext) => {
    return callRule(chain(rules), callSource(source, context), context);
  };
}


export function merge(sources: Source[], strategy: MergeStrategy = MergeStrategy.Default): Source {
  const empty = Observable.of<Tree>(staticEmpty());
  return (context: SchematicContext) => {
    return sources.reduce((acc: Observable<Tree>, curr: Source) => {
      const result = callSource(curr, context);
      return acc.concatMap(x => {
        return result.map(y => VirtualTree.merge(x, y, strategy || context.strategy));
      });
    }, empty);
  };
}


export function mergeWith(sources: Source[],
                          strategy: MergeStrategy = MergeStrategy.Default): Rule {
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
