# Proxy To Backend

Using the proxying support in webpack's dev server we can highjack certain urls and send them to a backend server.
We do this by passing a file to `--proxy-config`

Say we have a server running on `http://localhost:3000/api` and we want all calls to `http://localhost:4200/api` to go to that server.

We create a file next to projects `package.json` called `proxy.conf.json`
with the content

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

You can read more about what options are available here [webpack-dev-server proxy settings](https://webpack.github.io/docs/webpack-dev-server.html#proxy)

and then we edit the `package.json` file's start script to be

```json
"start": "ng serve --proxy-config proxy.conf.json",
```

now run it with `npm start`

### Multiple entries

If you need to proxy multiple entries to the same target define the configuration in `proxy.conf.js` e.g.

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
