# Angular Express Engine

This is an Express Engine for running Angular Apps on the server for server side rendering.

## Usage

`npm install @nguniversal/express-engine --save`

To use it, set the engine and then route requests to it

```ts
import * as express from 'express';
import { ngExpressEngine } from '@nguniversal/express-engine';

const app = express();

// Set the engine
app.engine('html', ngExpressEngine({
  bootstrap: ServerAppModule // Give it a module to bootstrap
}));

app.set('view engine', 'html');

app.get('/**/*', (req: Request, res: Response) => {
  res.render('../dist/index', {
    req,
    res
  });
});
```

## Configuring the URL and Document

It is possible to override the default URL and document fetched when the rendering engine
is called. To do so, simply pass in a `url` and/or `document` string to the renderer as follows:

```ts
app.get('/**/*', (req: Request, res: Response) => {
  let url = 'http://someurl.com';
  let doc = '<html><head><title>New doc</title></head></html>';
  res.render('../dist/index', {
    req,
    res,
    url,
    document: doc
  });
});
```

## Extra Providers

Extra Providers can be provided either on engine setup

```ts
app.engine('html', ngExpressEngine({
  bootstrap: ServerAppModule,
  providers: [
    ServerService
  ]
}));
```

## Advanced Usage

### Request based Bootstrap

The Bootstrap module as well as more providers can be passed on request

```ts
app.get('/**/*', (req: Request, res: Response) => {
  res.render('../dist/index', {
    req,
    res,
    bootstrap: OtherServerAppModule,
    providers: [
      OtherServerService
    ]
  });
});
```

### Using the Request and Response

The Request and Response objects are injected into the app via injection tokens.
You can access them by @Inject

```ts
import { Request } from 'express';
import { REQUEST } from '@nguniversal/express-engine/tokens';

@Injectable()
export class RequestService {
  constructor(@Inject(REQUEST) private request: Request) {}
}
```

If your app runs on the client side too, you will have to provide your own versions of these in the client app.

### Using a Custom Callback

You can also use a custom callback to better handle your errors

```ts
app.get('/**/*', (req: Request, res: Response) => {
  res.render('../dist/index', {
    req,
    res
  }, (err: Error, html: string) => {
    res.status(html ? 200 : 500).send(html || err.message);
  });
});
```
