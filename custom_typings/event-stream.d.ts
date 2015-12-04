// Type definitions for vinyl-buffer
// Project: https://github.com/dominictarr/event-stream
// Definitions by: Jeff Whelpley <https://github.com/jeffwhelpley>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "event-stream" {

    interface EventStream {
      map(cb: Function): NodeJS.ReadWriteStream;
    }

    var eventStream: EventStream;

    export = eventStream;
}
