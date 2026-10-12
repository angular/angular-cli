# Library Builds Scaling Benchmark

This benchmark measures build time metrics for Angular libraries.

## Context

Angular CLI is in the process of transitioning from `ng-packagr` to Angular CLI's native library builder.
Both library build systems are registered Architect builders:
- `@angular/build:ng-packagr`: runs library builds through the legacy `ng-packagr` build pipeline.
- `@angular/build:library`: runs library builds through Angular CLI's native library builder.

This benchmark suite is designed to quantify performance impacts and ensure scalability.

### Previous Benchmarks

For context, when running a similar benchmark suite directly against `ng-packagr`, it hinted at a "U-curve" in build times,
where build time per entry point in `ng-packagr` drops until entry point N (with N varying in the range 200..500).
This shape indicates an initial overhead as a possible explanation for a small number of entry points.
However, we discovered that `ng-packagr` build time per entry point increases
as the number of entry points scale past a certain N (in the test runs N=200+).

[Landing Angular CLI's native `@angular/build:library` builder](https://github.com/angular/angular-cli/pull/34106#issuecomment-5744311681),
indicated very favourable performance metrics for the new library builder that can be explained by number of
architectural changes in the library build pipeline:
- Shared Stylesheet Bundling
- Public API Invalidation via Declaration Hashing
- Dedicated Worker Pool for Production Builds
- Single Pass Output Emission
- Direct Async Pipeline

### Goals

This benchmark suite runs explorative research on the performance of library builds in Angular CLI.
Interesting results from the previous benchmarks indicate 2 measurable goals:

- Measure the new library builder against itself: How does it scale with the number of entry points?
- Enable A/B benchmarks of the `@angular/build:ng-packagr` builder against `@angular/build:library` builder: How much do library builds benefit from the transition to the native library builder?

As the previous benchmark runs hint at significant performance improvements in the new library builder,
this benchmark suite aims to quantify the impact of that transition.

## Benchmark Design

This suite supports two primary layouts to test different filesystem and entry-point scaling scenarios:

- **Flat (`--layout=flat`)**: Generates $N$ secondary entry points as direct siblings, where $N$
  comes straight from `--count`.
  - Design: Each entry point is named `comp-i` (e.g., `comp-0001`, `comp-0002`).

- **Deep (`--layout=deep`)**: Generates $2^N$ secondary entry points in a binary tree structure.
  - Design: Creates a nested directory structure (`sub-a`/`sub-b` at each level).
  - Depth $N$ is not an independent sweep parameter -- see "Sweep rounds" below.

Each entry point consists of a `public-api.ts` and a component file with an inline template
containing a bit of per-entry content derived from the entry's id (e.g. `<h2>Component no.
0042</h2>`), so entries aren't byte-identical copies of each other.

### Sweep rounds

`--count` is the one sweep parameter: a comma-separated list of entry-point count targets. The
default sweep spans small to large entry-point counts in one round, chosen to resolve the
U-shaped scaling pattern observed with `ng-packagr` (see above):
`10, 20, 50, 100, 200, 300, 400, 500, 1000, 2000`.

For `--layout=deep`, there's no "number of entry points" parameter directly -- a binary tree of
depth $N$ always has exactly $2^N$ leaves/entry points. So `--count`'s targets are translated into
tree depths: for each target `n`, the smallest `depth` with `2^depth >= n`, de-duplicated (e.g.
`300`, `400`, and `500` all round up to the same `depth=9`, i.e. 512 entry points). This keeps
both layouts comparable at roughly the same entry-point scale without exposing depth as a second,
independently-tunable sweep axis. `--depth` still exists as an **explicit override** for
`--layout=deep` -- pass it directly to sweep exact tree depths instead of entry-point targets --
but it is not part of the default sweep design and is ignored for `--layout=flat`.

## Running the Benchmarks

```sh
# Ensure the builder is built first
pnpm build

# Run the benchmark
pnpm admin benchmark library-builder [options]
```

### Options

| Option                 | Description                                     | Default                                  |
| :--------------------- | :----------------------------------------------- | :---------------------------------------- |
| `--layout=<flat\|deep>` | Fixture layout                                  | `flat`                                    |
| `--count=<n,n,...>`    | Entry-point count targets, drives both layouts  | `10,20,50,100,200,300,400,500,1000,2000` |
| `--depth=<n,n,...>`    | **`layout=deep` only.** Explicit tree depths, overriding the depths otherwise derived from `--count` | derived from `--count` |
| `--iterations=<n>`     | Measured iterations per size                    | `3`                                       |
| `--json`               | Output raw measurements as JSON                 | N/A                                       |

> `--count` and `--depth` are not independent sweep axes for `layout=deep`: `--count` is translated
> into depths (smallest `depth` with `2^depth >= n` per target, de-duplicated); `--depth` only
> matters when you want to bypass that translation and name exact tree depths yourself. Passing
> both for `layout=deep` makes `--depth` win; `--depth` is ignored entirely for `layout=flat`.

### Example

Sweep the flat layout at a single size:

```sh
pnpm admin benchmark library-builder --layout=flat --count=500
```

## Benchmark Results

_(To be filled in once a sweep has been run and reviewed. Out of scope for this iteration.)_

## Future Work

- Style-flavor matrix: inline / inline-css / inline-scss / external / external-css / external-scss, swept across both layouts.
- A/B comparison against `ng-packagr` (both are already registered Architect builders — `@angular/build:ng-packagr` and `@angular/build:library` — so this is a same-builder-package comparison, not a separate tool invocation).
- Dependencies between entry points.
- Shared stylesheet tokens imported by multiple components.
- Watch mode.
- Peak memory (`ru_maxrss`) and CPU time (`ru_utime` + `ru_stime`) metrics per build, in addition to wall-clock build time.
- Library "taste" variants beyond plain flat/deep, e.g. flat/deep with inter-entry-point dependencies or shared SCSS tokens (currently out of scope, listed above).
