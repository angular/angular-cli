<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->
**Documentation below is for CLI version 6 and we no longer accept PRs to improve this. For version 7 see [here](https://angular.io/cli/serve)**.

# ng serve

## Overview
`ng serve` builds the application and starts a web server.

```bash
ng serve [project]
```

## Options
<details>
  <summary>prod</summary>
  <p>
    <code>--prod</code>
  </p>
  <p>
    Flag to set configuration to "prod".
  </p>
</details>
<details>
  <summary>configuration</summary>
  <p>
    <code>--configuration</code> (alias: <code>-c</code>)
  </p>
  <p>
    Specify the configuration to use.
  </p>
</details>
<details>
  <summary>browser-target</summary>
  <p>
    <code>--browser-target</code>
  </p>
  <p>
    Target to serve.
  </p>
</details>
<details>
  <summary>port</summary>
  <p>
    <code>--port</code>
  </p>
  <p>
    Port to listen on.
  </p>
</details>
<details>
  <summary>host</summary>
  <p>
    <code>--host</code>
  </p>
  <p>
    Host to listen on.
  </p>
</details>
<details>
  <summary>proxy-config</summary>
  <p>
    <code>--proxy-config</code>
  </p>
  <p>
    Proxy configuration file.
  </p>
</details>
<details>
  <summary>ssl</summary>
  <p>
    <code>--ssl</code>
  </p>
  <p>
    Serve using HTTPS.
  </p>
</details>
<details>
  <summary>ssl-key</summary>
  <p>
    <code>--ssl-key</code>
  </p>
  <p>
    SSL key to use for serving HTTPS.
  </p>
</details>
<details>
  <summary>ssl-cert</summary>
  <p>
    <code>--ssl-cert</code>
  </p>
  <p>
    SSL certificate to use for serving HTTPS.
  </p>
</details>
<details>
  <summary>open</summary>
  <p>
    <code>--open</code> (alias: <code>-o</code>)
  </p>
  <p>
    Opens the url in default browser.
  </p>
</details>
<details>
  <summary>live-reload</summary>
  <p>
    <code>--live-reload</code>
  </p>
  <p>
    Whether to reload the page on change, using live-reload.
  </p>
</details>
<details>
  <summary>public-host</summary>
  <p>
    <code>--public-host</code>
  </p>
  <p>
    Specify the URL that the browser client will use.
  </p>
</details>
<details>
  <summary>serve-path</summary>
  <p>
    <code>--serve-path</code>
  </p>
  <p>
    The pathname where the app will be served.
  </p>
</details>
<details>
  <summary>disable-host-check</summary>
  <p>
    <code>--disable-host-check</code>
  </p>
  <p>
    Don't verify connected clients are part of allowed hosts.
  </p>
</details>
<details>
  <summary>hmr</summary>
  <p>
    <code>--hmr</code>
  </p>
  <p>
    Enable hot module replacement.
  </p>
</details>
<details>
  <summary>watch</summary>
  <p>
    <code>--watch</code>
  </p>
  <p>
    Rebuild on change.
  </p>
</details>
<details>
  <summary>hmr-warning</summary>
  <p>
    <code>--hmr-warning</code>
  </p>
  <p>
    Show a warning when the --hmr option is enabled.
  </p>
</details>
<details>
  <summary>serve-path-default-warning</summary>
  <p>
    <code>--serve-path-default-warning</code>
  </p>
  <p>
    Show a warning when deploy-url/base-href use unsupported serve path values.
  </p>
</details>
<details>
  <summary>optimization</summary>
  <p>
    <code>--optimization</code>
  </p>
  <p>
    Enables optimization of the build output.
  </p>
</details>
<details>
  <summary>aot</summary>
  <p>
    <code>--aot</code>
  </p>
  <p>
    Build using Ahead of Time compilation.
  </p>
</details>
<details>
  <summary>source-map</summary>
  <p>
    <code>--source-map</code>
  </p>
  <p>
    Output sourcemaps.
  </p>
</details>
<details>
  <summary>eval-source-map</summary>
  <p>
    <code>--eval-source-map</code>
  </p>
  <p>
    Output in-file eval sourcemaps.
  </p>
</details>
<details>
  <summary>vendor-source-map</summary>
  <p>
    <code>--vendor-source-map</code>
  </p>
  <p>
    Resolve vendor packages sourcemaps.
  </p>
</details>
<details>
  <summary>vendor-chunk</summary>
  <p>
    <code>--vendor-chunk</code>
  </p>
  <p>
    Use a separate bundle containing only vendor libraries.
  </p>
</details>
<details>
  <summary>common-chunk</summary>
  <p>
    <code>--common-chunk</code>
  </p>
  <p>
    Use a separate bundle containing code used across multiple bundles.
  </p>
</details>
<details>
  <summary>base-href</summary>
  <p>
    <code>--base-href</code>
  </p>
  <p>
    Base url for the application being built.
  </p>
</details>
<details>
  <summary>deploy-url</summary>
  <p>
    <code>--deploy-url</code>
  </p>
  <p>
    URL where files will be deployed.
  </p>
</details>
<details>
  <summary>verbose</summary>
  <p>
    <code>--verbose</code>
  </p>
  <p>
    Adds more details to output logging.
  </p>
</details>
<details>
  <summary>progress</summary>
  <p>
    <code>--progress</code>
  </p>
  <p>
    Log progress to the console while building.
  </p>
</details>