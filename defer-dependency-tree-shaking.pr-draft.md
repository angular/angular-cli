<!--
This is a draft PR description, kept as a plain file rather than opened as
a real PR. Nothing on this branch is committed. Read this together with
the diff before deciding whether to open it for real.
-->

# [DRAFT / RFC] Stop `@defer` from pulling in whole third-party libraries

**Status: proof of concept, not ready to merge. Opening this mainly to ask the compiler team one question (see the bottom).**

## The problem, in one example

Say a component only shows up inside an `@defer` block, and it comes from a library:

```ts
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  imports: [MarkdownComponent],
  template: `@defer (on viewport) { <markdown [data]="text" /> }`,
})
```

You'd expect the deferred chunk to contain `MarkdownComponent` and whatever it actually needs. Instead, it contains the _entire_ `ngx-markdown` package - every component, every pipe, the clipboard button, the KaTeX and Mermaid integration, all of it - even though nothing else in your app ever references those.

## Why: `import()` can't ask for one export

The compiler turns that defer block into something like this:

```js
import('ngx-markdown').then((m) => m.MarkdownComponent);
```

That's not a bug in the codegen - it's just what `import()` does. It's a JS operator, not syntax with a "give me just this one export" mode. It always resolves to the whole module's namespace object. So `m` is the entire `ngx-markdown` module, and nothing downstream can prove that `m.MarkdownComponent` is the only thing anyone ever reads off it. A bundler can't tree-shake what it can't prove is unused, so the rest of the package rides along.

Compare that to a plain static import - `import { MarkdownComponent } from 'ngx-markdown'` - which tells the bundler exactly which binding is used, and lets it drop the rest.

## Why this lives in `@angular/build`, not the compiler

The compiler's job is to emit code that works everywhere Angular runs - esbuild, ng-packagr, JIT in a browser, whatever. It can't bake in "assume esbuild and rewrite the import" because that would break every other consumer of that same output. This is a decision about the _bundled_ result, and the bundler is the only place that gets to make it.

## What this branch does

An esbuild plugin that:

1. Recognizes the shape the compiler emits (`import(specifier).then(m => m.Symbol)`, with a `@ts-ignore` comment the compiler happens to put right above it).
2. Rewrites it to import from a synthetic virtual module instead:
   ```js
   import('angular:defer-dep:ngx-markdown:MarkdownComponent').then((m) => m.MarkdownComponent);
   ```
3. That virtual module's content is just:
   ```js
   export { MarkdownComponent } from 'ngx-markdown';
   ```

A static named re-export, unlike a dynamic `import()`, gives esbuild the information it needs to tree-shake the rest of the package. esbuild does the actual work here - this plugin's only job is getting a static re-export in front of it.

Where it lives:

- `defer-dependency-detector.ts` - just the pattern-matching, isolated on purpose (see the open question below).
- `defer-dependency-rewriter.ts` - does the rewrite via `magic-string` (so it produces a real sourcemap), plus a guard that skips CommonJS packages (more on that below).
- `defer-dependency-plugin.ts` - the esbuild plugin, built on the existing `createVirtualModulePlugin` helper.
- One new line in `compiler-plugin.ts`, right before the compiled output gets cached, calling the rewriter.

## Does it actually work? Numbers, not vibes

**The ceiling - a library with genuinely independent exports (synthetic test, 8 unrelated classes, only 1 used):**

11,988 bytes → 1,397 bytes. **88% smaller.**

This is the case the bug report describes, and in that case the fix does exactly what you'd hope.

**The real-world case - `ngx-markdown`, deferring `MarkdownComponent`:**

59,804 bytes → 58,883 bytes. **1.5% smaller.**

Much less exciting, and worth being upfront about why: `MarkdownComponent` depends on `MarkdownService`, and `MarkdownService` isn't a small, separate thing you could theoretically shake away - it's one big file that already contains the KaTeX/Mermaid/clipboard option-handling code inline, because that's how the package author wrote it. Tree-shaking _does_ correctly drop the genuinely-unrelated stuff (`ClipboardButtonComponent`, `PrismPlugin`, `MarkdownModule` - confirmed these disappear from the output), but that's a small slice of the total file. Most of the weight was never avoidable for this component, fix or no fix.

Takeaway: this fix is real and it works, but how much it helps depends entirely on how a given library is structured. It'll do a lot for a component kit made of genuinely separate pieces, and not much for a library where the deferred symbol's own dependency chain already accounts for most of the bytes. `ngx-markdown` happened to be the example in the original bug report, and it's honestly not the best showcase for this - worth finding or building a better one before this goes further.

**A regression we found and fixed - CommonJS packages:**

Tested against `lodash` (`import("lodash").then(m => m.debounce)`). Before this fix: 73,060 bytes. First version of this fix: 73,598 bytes - _bigger_, not smaller. Turns out esbuild bundles a CommonJS module as one opaque object no matter which property you read off it afterwards, so rerouting through a static re-export doesn't unlock any tree-shaking there - it just adds an extra layer of indirection for nothing. Confirmed with a grep: both bundles contained lodash's entire export list, `debounce` or not.

Fixed by checking the target package's `package.json` (`type: "module"`, a `module` field, or an `import` condition in `exports`) before rewriting anything, and leaving CommonJS packages alone entirely. Re-tested after the fix: 73,060 → 73,060 bytes, no change either way. This guard is why `defer-dependency-rewriter.ts` exists as a separate step from the plugin - it's a decision that has to happen before the rewrite, not inside esbuild's module resolution.

**Default exports** work too - tested against a real package (`clsx`) by actually running the built output before and after the rewrite and confirming it computes the same result, plus a synthetic test (default export + 7 independent siblings) showing the same ~89% reduction as the named-export case.

**Sourcemaps** - the rewrite runs through `magic-string`, and tracing real esbuild output back through the generated map confirms surrounding code (the untouched half of the `.then()` call) still points at the correct original line. One real gap: this rewrite's own sourcemap isn't merged into the one `javascriptTransformer.transformData` produces right after it in `compiler-plugin.ts` - fine for this PoC since the rewrite is a same-line string swap, not something to leave unresolved before merging.

## What's explicitly not done here

- Only wired into the main browser bundle, not the server/SSR bundle path.
- No caching/watch-mode testing beyond reading the code and finding the right integration point (right before `typeScriptFileCache.set()`, so a cache hit returns already-rewritten content for free - untested against a real incremental rebuild).
- Sourcemap chaining into `javascriptTransformer.transformData`'s own remapping, as mentioned above.
- Only checked against ESM and CommonJS interop shapes, not every possible export style (re-exports under a different upstream name, e.g. `export { Foo as Bar }`, weren't tested - though the compiler always uses the name from the user's own `import` statement, so this should be transparent, just unverified).

## The actual question for the compiler team

The detection here is pattern-matching against `@angular/compiler`'s current output shape - specifically, an `import().then(param => param.prop)` call with a `@ts-ignore` comment sitting right above it. That comment is a real signal today (the compiler doesn't use `@ts-ignore` on that exact shape anywhere else), but it's an implementation detail of the printer, not a contract anyone promised to keep stable. It also happens to be the same comment the compiler uses for a few unrelated things elsewhere in the file, which is a little too close for comfort.

**Would it be reasonable to ask for a small, dedicated marker on defer-dependency imports specifically** - a distinct comment, or something else identifiable - so a bundler doesn't have to reverse-engineer "is this a defer dependency" from what the printer happens to currently produce? The detection logic is isolated into its own file (`defer-dependency-detector.ts`) specifically so that swapping "sniff the current shape" for "read an explicit marker" would be a contained change, not a rewrite of the rewriter or the plugin.

This PR is as much about surfacing that question as it is about the plugin itself.
