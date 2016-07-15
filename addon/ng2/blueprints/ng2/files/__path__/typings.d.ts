
// Typings reference file, see links for more information
// https://github.com/typings/typings
// https://www.typescriptlang.org/docs/handbook/writing-declaration-files.html

/// <reference path="<%= refToTypings %>/typings/index.d.ts" />
/// <reference path="../node_modules/typescript/lib/lib.es2015.core.d.ts" />
/// <reference path="../node_modules/typescript/lib/lib.es2015.collection.d.ts" />
/// <reference path="../node_modules/typescript/lib/lib.es2015.promise.d.ts" />

<% if(!isMobile) { %>
declare var System: any;
declare var module: { id: string };
declare var require: any;
<% } %>

