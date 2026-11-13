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
Environment: 4 vCPU (a CFS quota on 48 cores @ 2.4Ghz base / 3.5Ghz burst), 16 GiB cgroup limit, NVMe SSD.
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

### 2026-10-23: First A/B benchmark library builder vs. ng-packagr

Added the `--builder` axis: the fixture generator can now emit `ng-packagr`-shaped projects
(per-entry-point `ng-package.json`) next to the native builder's `exports`-map projects,
and `builder` is part of the JSON/CSV output.

We now have a basis for a first real A/B run. The full sweep takes hours and needs proper
preparation, so we decided to reduce the scope of a first A/B benchmark run:

- First A/B run of `@angular/build:library` against `@angular/build:ng-packagr`, using the fixtures above:
  - flat layout,
  - inline templates only (no stylesheets),
  - `--iterations=3`,
  - sizes 10 to 1000 (reduced from the default sweep to fit a ~30 minute timw window; no 2000-entry run).
- Environment: 4 vCPU (a CFS quota on 48 cores @ 2.4Ghz base / 3.5Ghz burst), 16 GiB cgroup limit, NVMe SSD, Linux, Node v24.15.0, `ng-packagr` 22.3.0-next.2
- Result:All 36 builds completed with `status: "ok"`.

```sh
pnpm admin benchmark library-builder --builder=library,ng-packagr --layout=flat \
  --count=10,50,100,200,500,1000 --iterations=3 --csv=<path>
```

| Entries | `library` median | `ng-packagr` median | Speedup | `library` ms/entry | `ng-packagr` ms/entry |
| ------: | ---------------: | ------------------: | ------: | -----------------: | --------------------: |
|      10 |            3.33s |               5.10s |    1.5x |              333.2 |                 510.3 |
|      50 |            3.54s |              14.20s |    4.0x |               70.8 |                 283.9 |
|     100 |            3.93s |              25.21s |    6.4x |               39.3 |                 252.1 |
|     200 |            4.47s |              48.16s |   10.8x |               22.3 |                 240.8 |
|     500 |            6.03s |             122.58s |   20.3x |               12.1 |                 245.2 |
|    1000 |           10.01s |             269.98s |   27.0x |               10.0 |                 270.0 |

**Conclusion:** `library` costs ~3s fixed plus 5-8ms per additional entry point, so ms/entry keeps
falling to ~10 at N=1000. `ng-packagr` costs ~225ms per additional entry up to N=200, then 248ms
(200-500) and 295ms (500-1000). The speedup grows from 1.5x (N=10) to 27x (N=1000).

Caveats:

- The `ng-packagr` rise past N=500 is a trend on medians of 3 runs (N=1000 runs span 256-274s), not yet the U-curve reported in earlier benchmarks.
- Output equivalence (bundles, declarations) of the two builders is not verified.
- Not measured: `deep` layout, stylesheets, N>=2000, other machine shapes.

Per-iteration CSV and the raw log are kept outside the repository (`tmp/benchmark-2026-10-23.md`).

### 2026-10-24: A/B Benchmark across `--style-flavor` and `--count` axis

For the fixtures in `flat` layout:

```sh
$ pnpm admin benchmark library-builder \
  --builder=library,ng-packagr \
  --layout=flat \
  --style-flavor=inline,inline-css,inline-scss,external,external-css,external-scss \
  --count=10,50,100 --iterations=5 \
  --csv=./tmp/benchmark-2026-10-24.csv
```

Environment: GitHub Codespace (2 cores, 8 GB):

```sh
$ cat /proc/meminfo
MemTotal:        8131876 kB
MemFree:          260780 kB
MemAvailable:    2296448 kB

$ cat /proc/cpuinfo
processor       : 0
vendor_id       : GenuineIntel
cpu family      : 6
model           : 106
model name      : Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz
cpu MHz         : 3393.038

processor       : 1
vendor_id       : GenuineIntel
cpu family      : 6
model           : 106
model name      : Intel(R) Xeon(R) Platinum 8370C CPU @ 2.80GHz
cpu MHz         : 3472.520
```

Results:

- `@angular/build:library` beats `@angular/build:ng-packagr` in all sweep axis, starting from the small N <= 100 entry point counts
- Build times of `@angular/build:library` stay consistent across the `--style-flavor` axis, indicating roughly x-y ms per entry point:
  - build time per entry point stays roughly flat regardless of inline/external templates and stylesheet language
  - the primary driver of total build time (for the full library) is the number of entry points (`count` axis)
- Total build time (for the full library) `@angular/build:library`

Build log:

```log
$ node --no-warnings=ExperimentalWarning --experimental-transform-types ./scripts/devkit-admin.mts benchmark library-builder --builder=library,ng-packagr --layout=flat --style-flavor=inline,inline-css,inline-scss,external,external-css,external-scss --count=10,50,100 --iterations=5 --csv=./tmp/benchmark-2026-10-24.csv

[library-builder] library-flat-10-inline (10 entry points)
  run 1/5: done in 10.63s
  run 2/5: done in 4.11s
  run 3/5: done in 4.08s
  run 4/5: done in 4.08s
  run 5/5: done in 4.28s
  median: 4.11s  (410.52ms/entry)

[library-builder] ng-packagr-flat-10-inline (10 entry points)
  run 1/5: done in 7.57s
  run 2/5: done in 6.12s
  run 3/5: done in 6.18s
  run 4/5: done in 6.44s
  run 5/5: done in 6.30s
  median: 6.30s  (630.33ms/entry)

[library-builder] library-flat-50-inline (50 entry points)
  run 1/5: done in 4.58s
  run 2/5: done in 4.52s
  run 3/5: done in 4.54s
  run 4/5: done in 4.70s
  run 5/5: done in 4.52s
  median: 4.54s  (90.88ms/entry)

[library-builder] ng-packagr-flat-50-inline (50 entry points)
  run 1/5: done in 16.46s
  run 2/5: done in 17.38s
  run 3/5: done in 17.73s
  run 4/5: done in 18.60s
  run 5/5: done in 16.53s
  median: 17.38s  (347.50ms/entry)

[library-builder] library-flat-100-inline (100 entry points)
  run 1/5: done in 5.23s
  run 2/5: done in 5.11s
  run 3/5: done in 5.54s
  run 4/5: done in 5.14s
  run 5/5: done in 5.30s
  median: 5.23s  (52.27ms/entry)

[library-builder] ng-packagr-flat-100-inline (100 entry points)
  run 1/5: done in 31.45s
  run 2/5: done in 30.15s
  run 3/5: done in 31.59s
  run 4/5: done in 30.58s
  run 5/5: done in 29.47s
  median: 30.58s  (305.78ms/entry)

[library-builder] library-flat-10-inline-css (10 entry points)
  run 1/5: done in 4.91s
  run 2/5: done in 3.98s
  run 3/5: done in 4.28s
  run 4/5: done in 4.11s
  run 5/5: done in 4.12s
  median: 4.12s  (412.22ms/entry)

[library-builder] ng-packagr-flat-10-inline-css (10 entry points)
  run 1/5: done in 6.05s
  run 2/5: done in 6.41s
  run 3/5: done in 6.13s
  run 4/5: done in 6.19s
  run 5/5: done in 6.29s
  median: 6.19s  (619.22ms/entry)

[library-builder] library-flat-50-inline-css (50 entry points)
  run 1/5: done in 4.69s
  run 2/5: done in 5.00s
  run 3/5: done in 5.02s
  run 4/5: done in 5.58s
  run 5/5: done in 5.39s
  median: 5.02s  (100.46ms/entry)

[library-builder] ng-packagr-flat-50-inline-css (50 entry points)
  run 1/5: done in 18.59s
  run 2/5: done in 17.77s
  run 3/5: done in 16.63s
  run 4/5: done in 17.64s
  run 5/5: done in 16.26s
  median: 17.64s  (352.87ms/entry)

[library-builder] library-flat-100-inline-css (100 entry points)
  run 1/5: done in 5.21s
  run 2/5: done in 5.57s
  run 3/5: done in 5.15s
  run 4/5: done in 5.25s
  run 5/5: done in 5.15s
  median: 5.21s  (52.12ms/entry)

[library-builder] ng-packagr-flat-100-inline-css (100 entry points)
  run 1/5: done in 28.20s
  run 2/5: done in 27.88s
  run 3/5: done in 27.33s
  run 4/5: done in 28.18s
  run 5/5: done in 27.30s
  median: 27.88s  (278.84ms/entry)

[library-builder] library-flat-10-inline-scss (10 entry points)
  run 1/5: done in 5.94s
  run 2/5: done in 4.45s
  run 3/5: done in 4.34s
  run 4/5: done in 4.37s
  run 5/5: done in 4.18s
  median: 4.37s  (436.70ms/entry)

[library-builder] ng-packagr-flat-10-inline-scss (10 entry points)
  run 1/5: done in 7.37s
  run 2/5: done in 6.54s
  run 3/5: done in 6.29s
  run 4/5: done in 6.32s
  run 5/5: done in 6.54s
  median: 6.54s  (653.80ms/entry)

[library-builder] library-flat-50-inline-scss (50 entry points)
  run 1/5: done in 4.84s
  run 2/5: done in 4.77s
  run 3/5: done in 4.81s
  run 4/5: done in 4.72s
  run 5/5: done in 4.98s
  median: 4.81s  (96.29ms/entry)

[library-builder] ng-packagr-flat-50-inline-scss (50 entry points)
  run 1/5: done in 16.12s
  run 2/5: done in 17.95s
  run 3/5: done in 15.98s
  run 4/5: done in 15.99s
  run 5/5: done in 16.54s
  median: 16.12s  (322.37ms/entry)

[library-builder] library-flat-100-inline-scss (100 entry points)
  run 1/5: done in 5.48s
  run 2/5: done in 5.42s
  run 3/5: done in 5.40s
  run 4/5: done in 5.38s
  run 5/5: done in 5.43s
  median: 5.42s  (54.18ms/entry)

[library-builder] ng-packagr-flat-100-inline-scss (100 entry points)
  run 1/5: done in 28.00s
  run 2/5: done in 28.23s
  run 3/5: done in 28.66s
  run 4/5: done in 27.14s
  run 5/5: done in 25.12s
  median: 28.00s  (279.99ms/entry)

[library-builder] library-flat-10-external (10 entry points)
  run 1/5: done in 3.59s
  run 2/5: done in 3.65s
  run 3/5: done in 3.93s
  run 4/5: done in 3.65s
  run 5/5: done in 3.66s
  median: 3.65s  (365.17ms/entry)

[library-builder] ng-packagr-flat-10-external (10 entry points)
  run 1/5: done in 6.10s
  run 2/5: done in 5.66s
  run 3/5: done in 5.49s
  run 4/5: done in 5.71s
  run 5/5: done in 5.88s
  median: 5.71s  (570.85ms/entry)

[library-builder] library-flat-50-external (50 entry points)
  run 1/5: done in 4.15s
  run 2/5: done in 4.10s
  run 3/5: done in 4.13s
  run 4/5: done in 4.12s
  run 5/5: done in 4.16s
  median: 4.13s  (82.62ms/entry)

[library-builder] ng-packagr-flat-50-external (50 entry points)
  run 1/5: done in 16.06s
  run 2/5: done in 15.63s
  run 3/5: done in 14.68s
  run 4/5: done in 17.45s
  run 5/5: done in 17.25s
  median: 16.06s  (321.17ms/entry)

[library-builder] library-flat-100-external (100 entry points)
  run 1/5: done in 4.52s
  run 2/5: done in 4.71s
  run 3/5: done in 4.67s
  run 4/5: done in 4.57s
  run 5/5: done in 4.51s
  median: 4.57s  (45.68ms/entry)

[library-builder] ng-packagr-flat-100-external (100 entry points)
  run 1/5: done in 27.89s
  run 2/5: done in 28.68s
  run 3/5: done in 29.08s
  run 4/5: done in 26.58s
  run 5/5: done in 27.23s
  median: 27.89s  (278.87ms/entry)

[library-builder] library-flat-10-external-css (10 entry points)
  run 1/5: done in 3.74s
  run 2/5: done in 3.82s
  run 3/5: done in 3.72s
  run 4/5: done in 3.91s
  run 5/5: done in 3.80s
  median: 3.80s  (379.65ms/entry)

[library-builder] ng-packagr-flat-10-external-css (10 entry points)
  run 1/5: done in 5.63s
  run 2/5: done in 5.86s
  run 3/5: done in 5.66s
  run 4/5: done in 5.50s
  run 5/5: done in 5.98s
  median: 5.66s  (565.62ms/entry)

[library-builder] library-flat-50-external-css (50 entry points)
  run 1/5: done in 4.13s
  run 2/5: done in 4.35s
  run 3/5: done in 4.17s
  run 4/5: done in 4.22s
  run 5/5: done in 4.34s
  median: 4.22s  (84.47ms/entry)

[library-builder] ng-packagr-flat-50-external-css (50 entry points)
  run 1/5: done in 14.36s
  run 2/5: done in 14.75s
  run 3/5: done in 14.42s
  run 4/5: done in 15.15s
  run 5/5: done in 15.48s
  median: 14.75s  (295.02ms/entry)

[library-builder] library-flat-100-external-css (100 entry points)
  run 1/5: done in 4.87s
  run 2/5: done in 4.90s
  run 3/5: done in 4.87s
  run 4/5: done in 4.66s
  run 5/5: done in 4.77s
  median: 4.87s  (48.71ms/entry)

[library-builder] ng-packagr-flat-100-external-css (100 entry points)
  run 1/5: done in 26.43s
  run 2/5: done in 26.93s
  run 3/5: done in 27.01s
  run 4/5: done in 26.46s
  run 5/5: done in 24.85s
  median: 26.46s  (264.56ms/entry)

[library-builder] library-flat-10-external-scss (10 entry points)
  run 1/5: done in 3.87s
  run 2/5: done in 3.98s
  run 3/5: done in 3.85s
  run 4/5: done in 3.92s
  run 5/5: done in 3.83s
  median: 3.87s  (387.06ms/entry)

[library-builder] ng-packagr-flat-10-external-scss (10 entry points)
  run 1/5: done in 5.81s
  run 2/5: done in 5.89s
  run 3/5: done in 5.97s
  run 4/5: done in 5.91s
  run 5/5: done in 6.05s
  median: 5.91s  (591.38ms/entry)

[library-builder] library-flat-50-external-scss (50 entry points)
  run 1/5: done in 4.59s
  run 2/5: done in 4.49s
  run 3/5: done in 4.42s
  run 4/5: done in 4.34s
  run 5/5: done in 4.48s
  median: 4.48s  (89.69ms/entry)

[library-builder] ng-packagr-flat-50-external-scss (50 entry points)
  run 1/5: done in 16.15s
  run 2/5: done in 16.11s
  run 3/5: done in 15.45s
  run 4/5: done in 16.25s
  run 5/5: done in 16.53s
  median: 16.15s  (323.04ms/entry)

[library-builder] library-flat-100-external-scss (100 entry points)
  run 1/5: done in 5.68s
  run 2/5: done in 5.58s
  run 3/5: done in 5.46s
  run 4/5: done in 5.49s
  run 5/5: done in 6.03s
  median: 5.58s  (55.81ms/entry)

[library-builder] ng-packagr-flat-100-external-scss (100 entry points)
  run 1/5: done in 29.19s
  run 2/5: done in 28.73s
  run 3/5: done in 30.11s
  run 4/5: done in 25.30s
  run 5/5: done in 25.74s
  median: 28.73s  (287.26ms/entry)
```

Results CSV: because of human mistake, the csv output was not written.

## Future Work

- Extend the A/B run against `ng-packagr` (first run: 2026-10-23, flat/inline, N up to 1000): `deep` layout, the style-flavor matrix, N=2000, more iterations, and an output-equivalence check of the two builders.
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
