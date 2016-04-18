/**
 * An abstract service that can be used to get and set the title of a current HTML document.
 */
export abstract class Title {

  abstract getTitle(): string;

  abstract setTitle(title: string): void;

}
