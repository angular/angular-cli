declare module "angular2/di" {
  class Binding {}
  function bind(token: any): any;
  class Injector {
    resolveAndCreateChild(bindings: [any]): Injector;
    static resolveAndCreate(bindings: any): any;
    static fromResolvedBindings(bindings: any): any;
    asyncGet(di: any):any;
    get(di: any):any;
  }
  var Inject: any;
  var Injectable: any;
  var Dependency: any;
  var Optional: any;

  var ResolvedBinding: any;
  var Key: any;
  var KeyRegistry: any;
  var TypeLiteral: any;
  var NoBindingError: any;
  var AbstractBindingError: any;
  var AsyncBindingError: any;
  var CyclicDependencyError: any;
  var InstantiationError: any;
  var InvalidBindingError: any;
  var NoAnnotationError: any;
  class OpaqueToken {
    constructor(token: any);
  }
  var ___esModule: any;
  var InjectAnnotation: any;
  var InjectPromiseAnnotation: any;
  var InjectLazyAnnotation: any;
  var OptionalAnnotation: any;
  var InjectableAnnotation: any;
  var DependencyAnnotation: any;
}
