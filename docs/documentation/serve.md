<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# ng serve

## Overview
`ng serve` builds the application and starts a web server

All the build Options are available in serve below are the additional options.

## Options
`--host` (`-H`) Listens only on localhost by default.

`--hmr` Enable hot module replacement.

`--live-reload` (`-lr`) Whether to reload the page on change, using live-reload.

`--live-reload-client` Specify the URL that the live reload browser client will use.

`--open` (`-o`) Opens the url in default browser.

`--port` (`-p`) Port to listen to for serving.

`--ssl`  Serve using HTTPS.

`--ssl-cert` SSL certificate to use for serving HTTPS.

`--ssl-key` SSL key to use for serving HTTPS.

## Note
When running `ng serve`, the compiled output is served from memory, not from disk. This means that the application being served is not located on disk in the `dist` folder.