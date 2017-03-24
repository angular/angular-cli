<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng serve

## Overview
`ng serve` builds the application and starts a web server.

All the build Options are available in serve, below are the additional options.

## Options
<details>
  <summary>host</summary>
  <p>
    `--host` (alias: `-H`) _default value: localhost_
  </p>
  <p>
    Listens only on localhost by default.
  </p>
</details>

<details>
  <summary>hmr</summary>
  <p>
    `--hmr` _default value: false_
  </p>
  <p>
    Enable hot module replacement.
  </p>
</details>

<details>
  <summary>live-reload</summary>
  <p>
    `--live-reload` (alias: `-lr`) _default value: true_
  </p>
  <p>
    Whether to reload the page on change, using live-reload.
  </p>
</details>

<details>
  <summary>live-reload-client</summary>
  <p>
    `--live-reload-client`
  </p>
  <p>
    Specify the URL that the live reload browser client will use.
  </p>
</details>

<details>
  <summary>open</summary>
  <p>
    `--open` (alias: `-o`) _default value: false_
  </p>
  <p>
    Opens the url in default browser.
  </p>
</details>

<details>
  <summary>port</summary>
  <p>
    `--port` (alias: `-p`) _default value: 4200_
  </p>
  <p>
    Port to listen to for serving.
  </p>
</details>

<details>
  <summary>ssl</summary>
  <p>
    `--ssl`
  </p>
  <p>
    Serve using HTTPS.
  </p>
</details>

<details>
  <summary>ssl-cert</summary>
  <p>
    `--ssl-cert` (alias: `-`) _default value: _
  </p>
  <p>
    SSL certificate to use for serving HTTPS.
  </p>
</details>

<details>
  <summary>ssl-key</summary>
  <p>
    `--ssl-key`
  </p>
  <p>
    SSL key to use for serving HTTPS.
  </p>
</details>

<details>
  <summary>aot</summary>
  <p>
    `--aot`
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>

<details>
  <summary>base-href</summary>
  <p>
    `--base-href` (alias: `-bh`)
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>

<details>
  <summary>deploy-url</summary>
  <p>
    `--deploy-url` (alias: `-d`)
  </p>
  <p>
    URL where files will be deployed.
  </p>
</details>

<details>
  <summary>environment</summary>
  <p>
    `--environment` (alias: `-e`)
  </p>
  <p>
    Defines the build environment.
  </p>
</details>

<details>
  <summary>extract-css</summary>
  <p>
    `--extract-css` (alias: `-ec`)
  </p>
  <p>
    Extract css from global styles onto css files instead of js ones.
  </p>
</details>

<details>
  <summary>i18n-file</summary>
  <p>
    `--i18n-file`
  </p>
  <p>
    Localization file to use for i18n.
  </p>
</details>

<details>
  <summary>i18n-format</summary>
  <p>
    `--i18n-format`
  </p>
  <p>
    Format of the localization file specified with --i18n-file.
  </p>
</details>

<details>
  <summary>locale</summary>
  <p>
    `--locale`
  </p>
  <p>
    Locale to use for i18n.
  </p>
</details>

<details>
  <summary>output-hashing</summary>
  <p>
    `--output-hashing` (alias: `-oh`) _default value: _
  </p>
  <p>
    Define the output filename cache-busting hashing mode. Possible values: `none`, `all`, `media`, `bundles`
  </p>
</details>

<details>
  <summary>output-path</summary>
  <p>
    `--output-path` (alias: `-op`) _default value: _
  </p>
  <p>
    Path where output will be placed.
  </p>
</details>

<details>
  <summary>poll</summary>
  <p>
    `--poll`
  </p>
  <p>
    Enable and define the file watching poll time period (milliseconds) .
  </p>
</details>

<details>
  <summary>progress</summary>
  <p>
    `--progress` (alias: `-pr`) _default value: true_
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>

<details>
  <summary>sourcemap</summary>
  <p>
    `--sourcemap` (alias: `-sm`, `sourcemaps`)
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>

<details>
  <summary>target</summary>
  <p>
    `--target` (aliases: `-t`, `-dev`, `-prod`) _default value: development_
  </p>
  <p>
    Defines the build target.
  </p>
</details>

<details>
  <summary>vendor-chunk</summary>
  <p>
    `--vendor-chunk` (aliases: `-vc`) _default value: true_
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>

<details>
  <summary>verbose</summary>
  <p>
    `--verbose` (aliases: `-v`) _default value: false_
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>

<details>
  <summary>watch</summary>
  <p>
    `--watch` (aliases: `-w`)
  </p>
  <p>
    Run build when files change.
  </p>
</details>


## Note
When running `ng serve`, the compiled output is served from memory, not from disk. This means that the application being served is not located on disk in the `dist` folder.
