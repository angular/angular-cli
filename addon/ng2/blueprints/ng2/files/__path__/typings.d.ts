// Typings reference file, see links for more information
// https://github.com/typings/typings
// https://www.typescriptlang.org/docs/handbook/writing-declaration-files.html

/// <reference path="<%= refToTypings %>/typings/browser.d.ts" />
<% if(!isMobile) { %>declare var module: { id: string };<% } %>
