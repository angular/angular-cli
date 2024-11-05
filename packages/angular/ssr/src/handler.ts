/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Function for handling HTTP requests in a web environment.
 *
 * @typeParam ContextType - The type for the optional `requestContext` parameter. Defaults to `unknown`.
 *
 * @param request - The incoming HTTP request object
 * @param requestContext - Optional additional context for rendering, such as request metadata.
 * @returns A Promise resolving to a `Response` object, `null`, or directly a `Response`,
 * supporting both synchronous and asynchronous handling.
 *
 * @developerPreview
 */
export type RequestHandlerFunction<ContextType = unknown> = (
  request: Request,
  requestContext?: ContextType,
) => Promise<Response | null> | null | Response;

/**
 * Annotates a request handler function with metadata, marking it as a special
 * handler.
 *
 * @param handler - The request handler function to be annotated.
 * @returns The same handler function passed in, with metadata attached.
 *
 * @example
 * Example usage in a Hono application:
 * ```ts
 * const app = new Hono();
 * export default createRequestHandler(app.fetch);
 * ```
 *
 * @example
 * Example usage in a H3 application:
 * ```ts
 * const app = createApp();
 * const handler = toWebHandler(app);
 * export default createRequestHandler(handler);
 * ```
 * @developerPreview
 */
export function createRequestHandler(handler: RequestHandlerFunction): RequestHandlerFunction {
  (handler as RequestHandlerFunction & { __ng_request_handler__?: boolean })[
    '__ng_request_handler__'
  ] = true;

  return handler;
}
