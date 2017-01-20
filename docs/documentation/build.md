# ng build

## Overview
`ng build` compiles the application into an output directory

## Options
`--target` (`-t`) define the build target

`--environment` (`-e`) defines the build environment

`--prod` flag to set build target and environment to production

`--dev` flag to set build target and environment to development

```bash
# these are equivalent
--target=production --environment=prod
--prod --env=prod
--prod
# and so are these
--target=development --environment=dev
--dev --e=dev
--dev
ng build
```

`--output-path` (`-o`) path where output will be placed

`--output-hashing` define the output filename cache-busting hashing mode

`--watch` (`-w`) flag to run builds when files change

`--surpress-sizes` flag to suppress sizes from build output

`--base-href` (`-bh`) base url for the application being built

`--aot` flag whether to build using Ahead of Time compilation

`--extract-css` extract css from global styles onto css files instead of js ones
