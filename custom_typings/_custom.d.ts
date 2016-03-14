/// <reference path="server.d.ts" />
/// <reference path="event-stream.d.ts" />
/// <reference path="gulp-insert.d.ts" />
/// <reference path="gulp-uglify.d.ts" />
/// <reference path="vinyl-buffer.d.ts" />

interface ObjectConstructorAssign {
  assign(target: any, ...sources: any[]): any;
}
interface ObjectConstructor extends ObjectConstructorAssign {

}
