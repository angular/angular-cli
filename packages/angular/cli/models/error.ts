// tslint:disable:no-global-tslint-disable file-header
export class NgToolkitError extends Error {
  constructor(message?: string) {
    super();

    if (message) {
      this.message = message;
    } else {
      this.message = this.constructor.name;
    }
  }
}
