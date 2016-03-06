/// <reference path="server.d.ts" />
/// <reference path="event-stream.d.ts" />
/// <reference path="gulp-insert.d.ts" />
/// <reference path="gulp-uglify.d.ts" />
/// <reference path="vinyl-buffer.d.ts" />

interface ObjectConstructorAssign {
  assign(): any;
  assign(obj): any;
  assign(obj, obj1): any;
  assign(obj, obj1, obj2): any;
  assign(obj, obj1, obj2, obj3): any;
}
interface ObjectConstructor extends ObjectConstructorAssign {

}
