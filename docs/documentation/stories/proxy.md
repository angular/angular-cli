# Proxy To Backend

Using the [proxying support](https://webpack.js.org/configuration/dev-server/#devserver-proxy) in webpack's dev server we can highjack certain URLs and send them to a backend server.
We do this by passing a file to `--proxy-config`

Say we have a server running on `http://localhost:3000/api` and we want all calls to `http://localhost:4200/api` to go to that server.

We create a file next to our project's `package.json` called `proxy.conf.json` with the content

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

You can read more about what options are available [here](https://webpack.js.org/configuration/dev-server/#devserver-proxy).

We can then edit the `package.json` file's start script to be

```json
"start": "ng serve --proxy-config proxy.conf.json",
```

Now in order to run our dev server with our proxy config, we can simply call `npm start`.

**After each edit to the proxy.conf.json file remember to relaunch the `npm start` process to make your changes effective.**

### Rewriting the URL path

One option that comes up a lot is rewriting the URL path for the proxy. This is supported by the `pathRewrite` option.

Say we have a server running on `http://localhost:3000` and we want all calls to `http://localhost:4200/api` to go to that server.

In our `proxy.conf.json` file, we add the following content

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "pathRewrite": {
      "^/api": ""
    }
  }
}
```

If you need to access a backend that is not on localhost, you will need to add the `changeOrigin` option as follows:

```json
{
  "/api": {
    "target": "http://npmjs.org",
    "secure": false,
    "pathRewrite": {
      "^/api": ""
    },
    "changeOrigin": true
  }
}
```

To help debug whether or not your proxy is working properly, you can also add the `logLevel` option as follows:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "pathRewrite": {
      "^/api": ""
    },
    "logLevel": "debug"
  }
}
```

Possible options for `logLevel` include `debug`, `info`, `warn`, `error`, and `silent` (default is `info`)


### Multiple entries

If you need to proxy multiple entries to the same target define the configuration in `proxy.conf.js` instead of `proxy.conf.json` e.g.

```js
const PROXY_CONFIG = [
    {
        context: [
            "/my",
            "/many",
            "/endpoints",
            "/i",
            "/need",
            "/to",
            "/proxy"
        ],
        target: "http://localhost:3000",
        secure: false
    }
]

module.exports = PROXY_CONFIG;
```

and make sure to point to the right file

```json
"start": "ng serve --proxy-config proxy.conf.js",
```

### Bypass the Proxy

If you need to optionally bypass the proxy, or dynamically change the request before it's sent,  define the configuration in proxy.conf.js e.g.

```js
const PROXY_CONFIG = {
    "/api/proxy": {
        "target": "http://localhost:3000",
        "secure": false,
        "bypass": function (req, res, proxyOptions) {
            if (req.headers.accept.indexOf("html") !== -1) {
                console.log("Skipping proxy for browser request.");
                return "/index.html";
            }
            req.headers["X-Custom-Header"] = "yes";
        }
    }
}

module.exports = PROXY_CONFIG;
```

again, make sure to point to the right file

```json
"start": "ng serve --proxy-config proxy.conf.js",
```
