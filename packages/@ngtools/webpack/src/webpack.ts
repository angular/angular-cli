// Declarations for (some) Webpack types. Only what's needed.

export interface Request {
  request?: Request;
  relativePath: string;
}

export interface Callback<T> {
  (err?: Error | null, result?: T): void;
}

export interface ResolverCallback {
  (request: Request, callback: Callback<void>): void;
}

export interface Tapable {
  apply(plugin: ResolverPlugin): void;
}

export interface ResolverPlugin extends Tapable {
  plugin(source: string, cb: ResolverCallback): void;
  doResolve(target: string, req: Request, desc: string, callback: Callback<any>): void;
  join(relativePath: string, innerRequest: Request): Request;
}

