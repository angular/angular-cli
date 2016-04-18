/**
 * The Storage abstract class of the Web Storage API provides access to local storage for a particular
 * domain.
 */
export abstract class LocalStorage {

  static length: number;

  abstract setItem(key: string, value: string): void;

  abstract getItem(): string;

  abstract removeItem(key: string): void;

  abstract key(index: number): string;

  abstract clear(): void;

}
