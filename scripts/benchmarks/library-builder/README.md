# Library Builds Scaling Benchmark

This benchmark suites measures build time metrics for Angular libraries.

## Context

Angular CLI is in the process of transitioning from `ng-packagr` to Angular CLI's native library builder.
Both library build systems are registered Architect builders:

- `@angular/build:ng-packagr`: runs library builds through the legacy `ng-packagr` build pipeline.
- `@angular/build:library`: runs library builds through Angular CLI's native library builder.

This benchmark suite is designed to quantify performance impacts and ensure scalability.

### Previous Benchmarks

For context, when running a comparable benchmark suite directly against `ng-packagr`, it hinted at a "U-curve" in build times,
where build time per entry point in `ng-packagr` drops until entry point N (with N varying in the range 200..500).
This shape indicates an initial overhead as a possible explanation for a small number of entry points.
However, we discovered that `ng-packagr` build time per entry point increases
as the number of entry points scale past a certain N (in the test runs N=200+).

[Landing Angular CLI's native `@angular/build:library` builder](https://github.com/angular/angular-cli/pull/34106#issuecomment-5744311681),
indicated very favourable performance metrics for the new library builder that can be explained by a number of
architectural changes in the design of the library build pipeline:

- Shared Stylesheet Bundling
- Public API Invalidation via Declaration Hashing
- Dedicated Worker Pool for Production Builds
- Single Pass Output Emission
- Direct Async Pipeline

The benchmark design of this suite is built to not only verify the previous results,
but also to confirm or contradict the architectural choices in the library builder pipeline.

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

Each entry point consists of a `public-api.ts` and a component file with a bit of per-entry
content derived from the entry's id (e.g. `<h2>Component no. 0042</h2>`), so entries aren't
byte-identical copies of each other.

### Builder axis (A/B)

`--builder=<list>` selects which Architect builder each fixture targets. The same synthetic sources
are emitted in either builder's project shape:

| Builder      | Architect builder           | Project shape                                                                                                            |
| :----------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `library`    | `@angular/build:library`    | One root `package.json` with a flat `exports` map; no `ng-package.json`.                                                 |
| `ng-packagr` | `@angular/build:ng-packagr` | Root `ng-package.json` (`dest`, `lib.entryFile`) plus one `ng-package.json` per secondary entry point; no `exports` map. |

Defaults to `library` only. Pass `--builder=library,ng-packagr` for an A/B run: the builder is the
innermost loop, so the two builds of an identical fixture size run back to back. `inline-scss`
sets `inlineStyleLanguage` on the builder for `library` and in `ng-package.json` for `ng-packagr`.

### Style-flavor matrix

`--style-flavor` is a second, independent sweep axis (crossed with `--layout` and the
count/depth sweep) controlling each entry point's template location and stylesheet
presence/language:

| Flavor          | Template               | Stylesheet                                        |
| :-------------- | :--------------------- | :------------------------------------------------ |
| `inline`        | inline `template`      | none                                              |
| `inline-css`    | inline `template`      | inline `styles`, plain CSS                        |
| `inline-scss`   | inline `template`      | inline `styles`, SCSS (via `inlineStyleLanguage`) |
| `external`      | external `templateUrl` | none                                              |
| `external-css`  | external `templateUrl` | external `styleUrl`, `.css` file                  |
| `external-scss` | external `templateUrl` | external `styleUrl`, `.scss` file                 |

`external` isolates the cost of the extra per-entry template file read from the cost of
stylesheet processing (it has no stylesheet, like `inline`, but reads its template from disk
like the other `external-*` flavors). SCSS content uses a per-entry variable
(`$ref-color-NNNN`) so the preprocessor does real work rather than passing through literal CSS.
Defaults to `inline` only -- the full 6-flavor matrix is opt-in via `--style-flavor=<list>`
since it multiplies the number of builds run by up to 6x.

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

| Option                     | Description                                                                                                                                               | Default                                  |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------- |
| `--layout=<flat\|deep>`    | Fixture layout                                                                                                                                            | `flat`                                   |
| `--builder=<b,b,...>`      | Builders to benchmark, one or more of `library`, `ng-packagr`. Pass both for an A/B run                                                                   | `library`                                |
| `--count=<n,n,...>`        | Entry-point count targets, drives both layouts                                                                                                            | `10,20,50,100,200,300,400,500,1000,2000` |
| `--depth=<n,n,...>`        | **`layout=deep` only.** Explicit tree depths, overriding the depths otherwise derived from `--count`                                                      | derived from `--count`                   |
| `--style-flavor=<f,f,...>` | Style-flavor targets (see "Style-flavor matrix" above), one or more of `inline`, `inline-css`, `inline-scss`, `external`, `external-css`, `external-scss` | `inline`                                 |
| `--iterations=<n>`         | Measured iterations per size                                                                                                                              | `3`                                      |
| `--json`                   | Output raw per-iteration measurements as JSON to stdout                                                                                                   | N/A                                      |
| `--csv=<path>`             | Write raw per-iteration measurements as CSV to `<path>`                                                                                                   | N/A (opt-in only)                        |

> `--count` and `--depth` are not independent sweep axes for `layout=deep`: `--count` is translated
> into depths (smallest `depth` with `2^depth >= n` per target, de-duplicated); `--depth` only
> matters when you want to bypass that translation and name exact tree depths yourself. Passing
> both for `layout=deep` makes `--depth` win; `--depth` is ignored entirely for `layout=flat`.

### Example

Sweep the flat layout at a single size:

```sh
pnpm admin benchmark library-builder --layout=flat --count=500
```

A/B run of both builders at a few sizes:

```sh
pnpm admin benchmark library-builder --builder=library,ng-packagr --layout=flat --count=10,50,200
```

Sweep the full style-flavor matrix at a single size, both layouts:

```sh
pnpm admin benchmark library-builder --layout=flat --count=500 \
  --style-flavor=inline,inline-css,inline-scss,external,external-css,external-scss
pnpm admin benchmark library-builder --layout=deep --count=500 \
  --style-flavor=inline,inline-css,inline-scss,external,external-css,external-scss
```

## Benchmark Results

Each entry below is one benchmark run, with its own summary and conclusions.

### 2026-10-12: Iteration 1 baseline sweep (native library builder, flat & deep)

First full run of the default sweep against `@angular/build:library` only &mdash; no `ng-packagr` A/B comparison yet (still Future Work).
Fixtures use inline HTML templates only, no stylesheets.
Default `--count` sweep, `--iterations=3`, both layouts.
Environment: 4-core / 16 GiB sandbox, NVMe SSD.
Raw log: `tmp/benchmark-run-1791795379.log` (gitignored; not included in this commit).

#### Flat layout (inline templates only)

| Entries | Median | ms/entry |
| ------: | -----: | -------: |
|      10 |  3.25s |   324.63 |
|      20 |  3.28s |   164.14 |
|      50 |  3.33s |    66.61 |
|     100 |  3.75s |    37.53 |
|     200 |  4.31s |    21.56 |
|     300 |  4.90s |    16.35 |
|     400 |  5.51s |    13.78 |
|     500 |  6.18s |    12.36 |
|    1000 | 10.29s |    10.29 |
|    2000 | 19.47s |     9.74 |

#### Deep layout (inline templates only)

| Entries | Median | ms/entry |
| ------: | -----: | -------: |
|      16 |  3.27s |   204.47 |
|      32 |  3.30s |   103.16 |
|      64 |  3.57s |    55.74 |
|     128 |  4.20s |    32.84 |
|     256 |  4.70s |    18.36 |
|     512 |  6.31s |    12.32 |
|    1024 | 10.25s |    10.01 |
|    2048 | 21.67s |    10.58 |

**Conclusion:** per-entry build time decreases monotonically across both layouts and flattens out
around 9.6-10.6ms/entry at the largest sizes tested -- no U-shaped climb-back-up at any tested
size (up to 2000/2048 entries), unlike the pattern reported for `ng-packagr` past N≈200-500. Flat
and deep track each other closely at comparable entry-point scale, suggesting the directory
layout itself isn't a meaningful cost driver for the native builder, just raw entry-point count.
`deep`'s depth-11 run (2048 entries) showed slightly higher run-to-run variance (20.78s-22.46s)
than `flat`'s 2000-entry run (19.46s-19.63s) -- possibly directory-tree-walk overhead at depth,
but not a regression, and not yet investigated further.

All 60 builds (10 sizes x 3 iterations x 2 layouts) completed with `status: "ok"`; zero failures.

### 2026-10-16: Style-flavor matrix implemented, fixture-correctness verification

Implemented the style-flavor matrix (`--style-flavor`, see "Style-flavor matrix" above):
`inline`, `inline-css`, `inline-scss`, `external`, `external-css`, `external-scss`, as a sweep
axis independent of `--layout`/`--count`/`--depth`. Defaults to `inline` only (matching the
prior behavior) since the full matrix multiplies build count by up to 6x; opt in with
`--style-flavor=<list>`.

This entry only verifies fixture correctness at small scale, not full-sweep performance
numbers -- a full style-flavor sweep is still Future Work.

Verification performed:

- `--layout=flat --count=5` and `--layout=deep --count=5` (8 entries, depth 3), all 6 flavors,
  `--iterations=1`: all 12 builds completed with `status: "ok"`.
- Manually inspected a generated `inline-scss` fixture's `angular.json` to confirm
  `inlineStyleLanguage: "scss"` is set only for that flavor, and compiled it standalone to
  confirm the per-entry SCSS variable (`$ref-color-NNNN`) resolves to a literal color in the
  built `.mjs` output (not left as unresolved `$...` syntax) -- i.e. SCSS is actually being
  preprocessed, not passed through as plain CSS.
- Repeated the same compiled-output check for `external-scss` with the `deep` layout --
  confirms external `.scss` stylesheets referenced via `styleUrl` also compile correctly.
- Verified `--csv` and `--json` output both include the new `styleFlavor` field.
- Verified `--style-flavor` rejects an unrecognized flavor name with a clear error listing the
  valid set, consistent with existing `--layout`/`--count`/`--depth` validation.

### 2026-10-22: Fixtures and harness prepared for A/B runs (no results yet)

Added the `--builder` axis (see "Builder axis (A/B)" above): the fixture generator can now emit
`ng-packagr`-shaped projects (per-entry-point `ng-package.json`) next to the native builder's
`exports`-map projects, and `builder` is part of the JSON/CSV output.

This entry is preparation only -- **no benchmark results are recorded here**. Verification performed:

- `--count=5` with both layouts, all 6 style flavors, both builders, `--iterations=1`: all 24
  builds completed with `status: "ok"`.
- Inspected `ng-packagr` output for a `deep`/`external-scss` fixture: every secondary entry point
  was built and bundled, and the per-entry SCSS variable compiled to a literal color, i.e. the
  fixtures exercise the same work on both builders.
- `--builder` rejects an unrecognized name with a clear error listing the valid set.
- A reduced, throwaway sweep (flat, counts 10/50/200, 2 iterations, once per builder) ran cleanly
  on both builders. Those numbers are deliberately not recorded: they are a smoke test, not a
  measurement.

We now have a basis for a first real A/B run. The full sweep takes hours and needs proper
preparation (quiet machine, fixed environment, enough iterations) before it is worth running.

## Future Work

- First real A/B run against `ng-packagr` (`--builder=library,ng-packagr`; the fixture generation and harness support are in place, see 2026-10-22). Needs a quiet machine and the full default sweep.
- Full style-flavor matrix sweep (default `--count` sweep x 6 flavors x 2 layouts) to quantify the actual performance impact of stylesheet processing and external file reads, now that the matrix is implemented.
- Dependencies between entry points.
- Shared stylesheet tokens imported by multiple components.
- Watch mode.
- Peak memory and CPU time metrics per build, in addition to wall-clock build time. Note:
  `child.resourceUsage()` does **not** exist on Node's `ChildProcess` (only `process.resourceUsage()`
  exists, and it reports the calling process's own usage, not a child's) -- the real path is
  polling `/proc/<pid>/status` (`VmHWM`) and `/proc/<pid>/stat` (`utime`+`stime`) on a timer while
  the build subprocess is alive, which is Linux-only and requires moving `buildOnce` off
  `spawnSync` onto `spawn()` so a polling timer can interleave with the child's lifetime.
- Library "taste" variants beyond plain flat/deep, e.g. flat/deep with inter-entry-point dependencies or shared SCSS tokens (currently out of scope, listed above).
