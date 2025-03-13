/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Represents a middleware function for handling HTTP requests in a Node.js environment.
 *
 * @param req - The incoming HTTP request object.
 * @param res - The outgoing HTTP response object.
 * @param next - A callback function that signals the completion of the middleware or forwards the error if provided.
 *
 * @returns A Promise that resolves to void or simply void. The handler can be asynchronous.
 */
export type NodeRequestHandlerFunction = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => Promise<void> | void;

/**
 * Attaches metadata to the handler function to mark it as a special handler for Node.js environments.
 *
 * @typeParam T - The type of the handler function.
 * @param handler - The handler function to be defined and annotated.
 * @returns The same handler function passed as an argument, with metadata attached.
 *
 * @example
 * Usage in an Express application:
 * ```ts
 * const app = express();
 * export default createNodeRequestHandler(app);
 * ```
 *
 * @example
 * Usage in a Hono application:
 * ```ts
 * const app = new Hono();
 * export default createNodeRequestHandler(async (req, res, next) => {
 *   try {
 *     const webRes = await app.fetch(createWebRequestFromNodeRequest(req));
 *     if (webRes) {
 *       await writeResponseToNodeResponse(webRes, res);
 *     } else {
 *       next();
 *     }
 *   } catch (error) {
 *     next(error);
 *   }
 * }));
 * ```
 *
 * @example
 * Usage in a Fastify application:
 * ```ts
 * const app = Fastify();
 * export default createNodeRequestHandler(async (req, res) => {
 *   await app.ready();
 *   app.server.emit('request', req, res);
 *   res.send('Hello from Fastify with Node Next Handler!');
 * }));
 * ```
 */
export function createNodeRequestHandler<T extends NodeRequestHandlerFunction>(handler: T): T {
  (handler as T & { __ng_node_request_handler__?: boolean })['__ng_node_request_handler__'] = true;

  return handler;
}
