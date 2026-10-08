# `@angular/build:library` scaling benchmark

This benchmark measures how `@angular/build:library`'s cold build time scales with the number
of secondary entry points in an Angular Package Format (APF) library, across two structurally
different layouts (flat siblings vs. a deeply nested tree) and three component style variants
(inline template, inline template + styles, external template/stylesheet files).

## Why

A comparison against [ng-packagr](https://github.com/ng-packagr/ng-packagr) (a third-party APF
build tool) found that its build time **per entry point** grows super-linearly once a library
has more than roughly 300-500 secondary entry points -- doubling the library size past that
point costs noticeably more than double the build time. This suite exists to check whether
`@angular/build:library`, a from-scratch build pipeline unrelated to ng-packagr's implementation,
shows the same growth on equivalent fixtures.

**Finding:** it does not. Across the same sweep (flat layout: 10/50/300/1000/2000 entries; deep
layout: tree depths 2/5/8/11, i.e. 4/32/256/2048 entries), `@angular/build:library`'s per-entry
cost keeps falling as the library grows, with no climb at the largest sizes tested. It is also
1.8-13x faster than ng-packagr at matching sizes, with the gap widening as size increases. See
the PR description this suite was added alongside for the full writeup and caveats.

## Running it

```sh
pnpm build   # or: pnpm admin build --local -- the benchmark measures the compiled builder,
             # not TypeScript source, so it must exist at dist/@angular/build and
             # dist/@angular-devkit/architect first
pnpm admin benchmark library-builder
```

Options:

```
--layout=<flat|deep>       Fixture layout (default: flat)
--style=<inline|inline-scss|external>   Component style variant (default: inline)
--sizes=<n,n,...>          Entry-point counts to sweep, layout=flat only (default: 10,50,300,1000,2000)
--depths=<n,n,...>         Tree depths to sweep, layout=deep only (default: 2,5,8,11)
--iterations=<n>           Measured iterations per size (default: 2)
--json                     Output raw measurements as JSON instead of a human-readable log
```

Example: sweep the external-style variant at a few sizes with 3 iterations each:

```sh
pnpm admin benchmark library-builder --style=external --sizes=100,500,1000 --iterations=3
```

## How it works

- `fixtures.mts` generates a synthetic library at a given size/layout/style: a primary entry
  point, N secondary entry points (each a minimal standalone Angular component), and the
  `angular.json`/`tsconfig.lib.json`/`package.json` scaffolding `@angular/build:library` needs.
  Secondary entry points are declared as a single flat `exports` map in the root `package.json`
  (the builder's actual convention), not as separate per-entry config files.
- `index.mts` times `architect lib:build` (the standalone `@angular-devkit/architect` CLI,
  invoked directly -- no `ng` CLI needed) once per iteration via `child_process.spawnSync`,
  discards the generated project afterwards, and reports per-size median build time.
- Because `@angular/build` and `@angular-devkit/architect` are Bazel-built workspace packages
  rather than ordinary npm dependencies, a plain `pnpm install` never links them (or their own
  dependencies) into the repo's root `node_modules` -- nothing in `dist/` is resolvable via a
  bare `require()`/`import` otherwise. On first run, `index.mts` symlinks `@angular/build` and
  `@angular-devkit/architect` from `dist/` into the root `node_modules`, then walks their
  declared `dependencies` and links any of those still missing from the pnpm store. This only
  touches `node_modules` (already gitignored) and is idempotent -- safe to run repeatedly or
  alongside other work in the same checkout.

## Methodology notes

- Each reported number is the **median** of the measured iterations, not the mean -- process-spawn
  wall-clock timings are noisy and right-skewed, and the median is more representative of steady
  state than an outlier-sensitive mean.
- Results are specific to the machine they were collected on. Run on one otherwise-idle machine
  for a self-consistent sweep; absolute numbers will differ across hardware, though the _shape_
  of the curve (does per-entry cost grow with size, or not) is the more portable finding.
- This benchmark only covers **cold, one-shot builds**. It does not exercise incremental rebuilds
  or watch mode.
