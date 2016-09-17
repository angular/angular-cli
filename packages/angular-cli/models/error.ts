export class NgToolkitError extends Error {
  constructor(message?: string) {
    super();

    if (message) {
      this.message = message;
    } else {
      this.message = (<any>this.constructor).name;
    }
  }
}
