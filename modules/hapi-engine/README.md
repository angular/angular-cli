# Angular Hapi Engine

This is a Hapi Engine for running Angular Apps on the server for server side rendering.

## Usage

`npm install @nguniversal/hapi-engine --save`

To use it, set the engine and then route requests to it

```ts
import { Base_Reply, Request, Server } from 'hapi';
import { ngHapiEngine } from '@nguniversal/hapi-engine';

const server = new Server();
server.connection({
  host: 'localhost',
  port: 8000
});

// Set the engine
const hapiEngine = ngHapiEngine({
  bootstrap: ServerAppModule // Give it a module to bootstrap
});

server.route({
  method: 'GET',
  path: '/{path*}',
  handler: (req: Request, reply: Base_Reply) => {
    hapiEngine({
      req
    }).then(html => reply(html))
      .then(err => reply(boom.wrap(err)));
  }
});
```

## Configuring the URL and Document

It is possible to override the default URL and document fetched when the rendering engine
is called. To do so, simply pass in a `url` and/or `document` string to the renderer as follows:

```ts
server.route({
  method: 'GET',
  path: '/{path*}',
  handler: (req: Request, reply: Base_Reply) => {
    let url = 'http://someurl.com';
    let doc = '<html><head><title>New doc</title></head></html>';
    hapiEngine({
      req,
      url,
      document: doc
    }).then(html => reply(html))
      .then(err => reply(boom.wrap(err)));
  }
});
```

## Extra Providers

Extra Providers can be provided either on engine setup

```ts
const hapiEngine = ngHapiEngine({
  bootstrap: ServerAppModule,
  providers: [
    ServerService
  ]
});
```

## Advanced Usage

### Request based Bootstrap

The Bootstrap module as well as more providers can be passed on request

```ts
server.route({
  method: 'GET',
  path: '/{path*}',
  handler: (req: Request, reply: Base_Reply) => {
    hapiEngine({
      bootstrap: OtherServerAppModule,
      providers: [
        OtherServerService
      ],
      req
    }).then(html => reply(html))
      .then(err => reply(boom.wrap(err)));
  }
});
```

### Using the Request and Response

The Request and Response objects are injected into the app via injection tokens.
You can access them by @Inject

```ts
import { Request } from 'hapi';
import { REQUEST } from '@nguniversal/hapi-engine';

@Injectable()
export class RequestService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

If your app runs on the client side too, you will have to provide your own versions of these in the client app.
