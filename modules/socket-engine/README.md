# Angular Universal Socket Engine

Framework and Platform agnostic Angular Universal rendering.

## Usage Server

`npm install @nguniversal/socket-engine @nguniversal/common --save`

```js
const socketEngine = require('@nguniversal/socket-engine');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP} = require('./dist/server/main');

socketEngine.startSocketEngine(AppServerModuleNgFactory);
```
This will the socket engine which internally hosts a TCP Socket server.  
The default port is `9090` and host of `localhost`
You may want to leave this as a plain `.js` file since it is so simple and to make deploying it easier, but it can be easily transpiled from Typescript.  

## Usage Client

Your client can be whatever language, framework or platform you like.  
As long as it can connect to a TCP Socket (which all frameworks can) then you're good to go.

This example will use JS for simplicity
```typescript
import * as net from 'net';

const client = net.createConnection(9090, 'localhost', () => {
  console.log('connected to SSR server');
});

client.on('data', data => {
  const res = JSON.parse(data.toString()) as SocketEngineResponse;
  expect(res.id).toEqual(1);
  expect(res.html).toEqual(template);
  server.close();
  done();
});

const renderOptions = {id: 1, url: '/path', document: '<app-root></app-root>'} as SocketEngineRenderOptions;
client.write(JSON.stringify(renderOptions));
```