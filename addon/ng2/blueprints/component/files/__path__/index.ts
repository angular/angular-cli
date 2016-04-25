<% if (route) { %>export * from './shared';
<% } %>export {<%= classifiedModuleName %>Component} from './<%= dasherizedModuleName %>.component';
