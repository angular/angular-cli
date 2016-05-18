export interface CookieAttributes {
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
}

/**
 * An abstract class for handling cookies.
 */
export abstract class Cookie {

  abstract set(key: string, value: string, attributes?: CookieAttributes): void;

  abstract get(key?: string): string;

  abstract remove(key: string, attributes?: CookieAttributes);

  abstract toJSON(): Object;

}
