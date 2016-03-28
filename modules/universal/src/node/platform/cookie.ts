export interface ICookieAttributes {
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
}

/**
 * An abstract class for handling cookies.
 */
export abstract class CookieAdapter {

  abstract set(key: string, value: string, attributes?: ICookieAttributes): void;

  abstract get(key?: string): string;

  abstract remove(key: string, attributes?: ICookieAttributes);

}
