/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { findDeferDependencyImports } from './defer-dependency-detector';

describe('findDeferDependencyImports', () => {
  it('matches the current @angular/compiler defer resolver output', () => {
    const code = `
const App_Defer_2_DepsFn = () => [/* @ts-ignore */
    import("ngx-markdown").then(m => m.MarkdownComponent)];
`;

    const matches = findDeferDependencyImports(code, 'app.js');

    expect(matches.length).toBe(1);
    expect(matches[0].specifier).toBe('ngx-markdown');
    expect(matches[0].symbol).toBe('MarkdownComponent');
  });

  it('matches a default-import dependency (`m.default`)', () => {
    const code = `
const DepsFn = () => [/* @ts-ignore */
    import("clsx").then(m => m.default)];
`;

    const matches = findDeferDependencyImports(code, 'app.js');

    expect(matches.length).toBe(1);
    expect(matches[0].symbol).toBe('default');
  });

  it('matches every occurrence, including the ngDevMode-gated class metadata one', () => {
    // Same shape shows up twice in real compiler output: once in the defer
    // resolver, once in the dev-only `ɵsetClassMetadataAsync` call.
    const code = `
const App_Defer_2_DepsFn = () => [/* @ts-ignore */
    import("ngx-markdown").then(m => m.MarkdownComponent)];
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadataAsync(App, () => [/* @ts-ignore */
    import("ngx-markdown").then(m => m.MarkdownComponent)], MarkdownComponent => {}); })();
`;

    expect(findDeferDependencyImports(code, 'app.js').length).toBe(2);
  });

  it('does not match without the @ts-ignore comment', () => {
    // The shape alone isn't enough - @ts-ignore is required precisely
    // because hand-written code (e.g. a Router loadComponent route) can
    // have this exact shape too.
    const code = `const fn = () => [import("some-lib").then(m => m.Something)];`;

    expect(findDeferDependencyImports(code, 'app.js')).toEqual([]);
  });

  it('does not match a relative specifier (Router loadComponent/loadChildren shape)', () => {
    // This is the real false-positive risk: a hand-written lazy route has
    // the exact same `import().then(m => m.X)` shape, and could even have
    // a stray @ts-ignore above it. We should never touch this - there's no
    // "whole library got pulled in" problem to fix for a relative import,
    // and it's the developer's own code, not something Angular generated.
    const code = `
const routes = [{
  path: 'foo',
  /* @ts-ignore */
  loadComponent: () => import('./foo.component').then(m => m.FooComponent),
}];
`;

    expect(findDeferDependencyImports(code, 'app.js')).toEqual([]);
  });

  it('does not match an absolute specifier', () => {
    const code = `const fn = () => [/* @ts-ignore */\n  import("/abs/path.js").then(m => m.X)];`;

    expect(findDeferDependencyImports(code, 'app.js')).toEqual([]);
  });

  it('does not match a plain static import', () => {
    const code = `import { MarkdownComponent } from 'ngx-markdown';`;

    expect(findDeferDependencyImports(code, 'app.js')).toEqual([]);
  });

  it('does not match a .then() callback that reads more than one property', () => {
    const code = `const fn = () => [/* @ts-ignore */\n  import("some-lib").then(m => m.a.b)];`;

    expect(findDeferDependencyImports(code, 'app.js')).toEqual([]);
  });

  it('reports offsets that span exactly the import() argument list', () => {
    const code = `const fn = () => [/* @ts-ignore */\n    import("some-lib").then(m => m.Foo)];`;

    const [match] = findDeferDependencyImports(code, 'app.js');

    expect(code.slice(match.start, match.end)).toBe('"some-lib"');
  });
});
