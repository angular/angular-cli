<!-- Links in /docs/documentation should NOT have `.md` at the end, because they end up in our wiki at release. -->

# Using corporate proxy

If you work behind a corporate proxy, the regular [backend proxy](https://github.com/angular/angular-cli/wiki/stories-proxy) configuration will not work if you try to proxy calls to any URL outside your local network.

In this case, you can configure the backend proxy to redirect calls through your corporate proxy using an agent:

```bash
npm install --save-dev https-proxy-agent
```

Then instead of using a `proxy.conf.json` file, we create a file called `proxy.conf.js` with the content

```js
var HttpsProxyAgent = require('https-proxy-agent');
var proxyConfig = [{
  context: '/api',
  target: 'http://your-remote-server.com:3000',
  secure: false
}];

function setupForCorporateProxy(proxyConfig) {
  var proxyServer = process.env.http_proxy || process.env.HTTP_PROXY;
  if (proxyServer) {
    var agent = new HttpsProxyAgent(proxyServer);
    console.log('Using corporate proxy server: ' + proxyServer);
    proxyConfig.forEach(function(entry) {
      entry.agent = agent;
    });
  }
  return proxyConfig;
}

module.exports = setupForCorporateProxy(proxyConfig);
```

and edit the `package.json` file's start script accordingly

```json
"start": "ng serve --proxy-config proxy.conf.js",
```

This way if you have a `http_proxy` or `HTTP_PROXY` environment variable defined, an agent will automatically be added to pass calls through your corporate proxy when running `npm start`.
