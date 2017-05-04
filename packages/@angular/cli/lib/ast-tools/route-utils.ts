import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import {Change, InsertChange, NoopChange} from './change';
import {findNodes} from './node';
import {insertAfterLastOccurrence} from './ast-utils';
import {NodeHost, Host} from './change';

/**
 * Adds imports to mainFile and adds toBootstrap to the array of providers
 * in bootstrap, if not present
 * @param mainFile main.ts
 * @param imports Object { importedClass: ['path/to/import/from', defaultStyleImport?] }
 * @param toBootstrap
 */
export function bootstrapItem(
  mainFile: string,
  imports: {[key: string]: (string | boolean)[]},
  toBootstrap: string
) {
  let changes = Object.keys(imports).map(importedClass => {
    let defaultStyleImport = imports[importedClass].length === 2 && !!imports[importedClass][1];
    return insertImport(
      mainFile,
      importedClass,
      imports[importedClass][0].toString(),
      defaultStyleImport
    );
  });
  let rootNode = getRootNode(mainFile);
  // get ExpressionStatements from the top level syntaxList of the sourceFile
  let bootstrapNodes = rootNode.getChildAt(0).getChildren().filter(node => {
    // get bootstrap expressions
    return node.kind === ts.SyntaxKind.ExpressionStatement &&
        (node.getChildAt(0).getChildAt(0) as ts.Identifier).text.toLowerCase() === 'bootstrap';
  });
  if (bootstrapNodes.length !== 1) {
    throw new Error(`Did not bootstrap provideRouter in ${mainFile}` +
                                    ' because of multiple or no bootstrap calls');
  }
  let bootstrapNode = bootstrapNodes[0].getChildAt(0);
  let isBootstraped = findNodes(bootstrapNode, ts.SyntaxKind.SyntaxList) // get bootstrapped items
                      .reduce((a, b) => a.concat(b.getChildren().map(n => n.getText())), [])
                      .filter(n => n !== ',')
                      .indexOf(toBootstrap) !== -1;
  if (isBootstraped) {
    return changes;
  }
  // if bracket exitst already, add configuration template,
  // otherwise, insert into bootstrap parens
  let fallBackPos: number, configurePathsTemplate: string, separator: string;
  let syntaxListNodes: any;
  let bootstrapProviders = bootstrapNode.getChildAt(2).getChildAt(2); // array of providers

  if ( bootstrapProviders ) {
    syntaxListNodes = bootstrapProviders.getChildAt(1).getChildren();
    fallBackPos = bootstrapProviders.getChildAt(2).pos; // closeBracketLiteral
    separator = syntaxListNodes.length === 0 ? '' : ', ';
    configurePathsTemplate = `${separator}${toBootstrap}`;
  } else {
    fallBackPos = bootstrapNode.getChildAt(3).pos; // closeParenLiteral
    syntaxListNodes = bootstrapNode.getChildAt(2).getChildren();
    configurePathsTemplate = `, [ ${toBootstrap} ]`;
  }

  changes.push(insertAfterLastOccurrence(syntaxListNodes, configurePathsTemplate,
    mainFile, fallBackPos));
  return changes;
}

/**
* Add Import `import { symbolName } from fileName` if the import doesn't exit
* already. Assumes fileToEdit can be resolved and accessed.
* @param fileToEdit (file we want to add import to)
* @param symbolName (item to import)
* @param fileName (path to the file)
* @param isDefault (if true, import follows style for importing default exports)
* @return Change
*/

export function insertImport(fileToEdit: string, symbolName: string,
                                  fileName: string, isDefault = false): Change {
  if (process.platform.startsWith('win')) {
    fileName = fileName.replace(/\\/g, '/'); // correction in windows
  }
  let rootNode = getRootNode(fileToEdit);
  let allImports = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);

  // get nodes that map to import statements from the file fileName
  let relevantImports = allImports.filter(node => {
    // StringLiteral of the ImportDeclaration is the import file (fileName in this case).
    let importFiles = node.getChildren().filter(child => child.kind === ts.SyntaxKind.StringLiteral)
                      .map(n => (<ts.StringLiteral>n).text);
    return importFiles.filter(file => file === fileName).length === 1;
  });

  if (relevantImports.length > 0) {

    let importsAsterisk = false;
    // imports from import file
    let imports: ts.Node[] = [];
    relevantImports.forEach(n => {
      Array.prototype.push.apply(imports, findNodes(n, ts.SyntaxKind.Identifier));
      if (findNodes(n, ts.SyntaxKind.AsteriskToken).length > 0) {
        importsAsterisk = true;
      }
    });

    // if imports * from fileName, don't add symbolName
    if (importsAsterisk) {
      return;
    }

    let importTextNodes = imports.filter(n => (<ts.Identifier>n).text === symbolName);

    // insert import if it's not there
    if (importTextNodes.length === 0) {
      let fallbackPos = findNodes(relevantImports[0], ts.SyntaxKind.CloseBraceToken)[0].pos ||
                        findNodes(relevantImports[0], ts.SyntaxKind.FromKeyword)[0].pos;
      return insertAfterLastOccurrence(imports, `, ${symbolName}`, fileToEdit, fallbackPos);
    }
    return new NoopChange();
  }

  // no such import declaration exists
  let useStrict = findNodes(rootNode, ts.SyntaxKind.StringLiteral)
                  .filter((n: ts.StringLiteral) => n.text === 'use strict');
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }
  let open = isDefault ? '' : '{ ';
  let close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  let insertAtBeginning = allImports.length === 0 && useStrict.length === 0;
  let separator = insertAtBeginning ? '' : ';\n';
  let toInsert = `${separator}import ${open}${symbolName}${close}` +
    ` from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;
  return insertAfterLastOccurrence(
    allImports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral
  );
}

/**
 * Inserts a path to the new route into src/routes.ts if it doesn't exist
 * @param routesFile
 * @param pathOptions
 * @return Change[]
 * @throws Error if routesFile has multiple export default or none.
 */
export function addPathToRoutes(routesFile: string, pathOptions: any): Change[] {
  let route = pathOptions.route.split('/')
              .filter((n: string) => n !== '').join('/'); // change say `/about/:id/` to `about/:id`
  let isDefault = pathOptions.isDefault ? ', useAsDefault: true' : '';
  let outlet = pathOptions.outlet ? `, outlet: '${pathOptions.outlet}'` : '';

  // create route path and resolve component import
  let positionalRoutes = /\/:[^/]*/g;
  let routePath = route.replace(positionalRoutes, '');
  routePath = `./app/${routePath}/${pathOptions.dasherizedName}.component`;
  let originalComponent = pathOptions.component;
  pathOptions.component = resolveImportName(
    pathOptions.component,
    routePath,
    pathOptions.routesFile
  );

  let content = `{ path: '${route}', component: ${pathOptions.component}${isDefault}${outlet} }`;
  let rootNode = getRootNode(routesFile);
  let routesNode = rootNode.getChildAt(0).getChildren().filter(n => {
    // get export statement
    return n.kind === ts.SyntaxKind.ExportAssignment &&
           n.getFullText().indexOf('export default') !== -1;
  });
  if (routesNode.length !== 1) {
    throw new Error('Did not insert path in routes.ts because ' +
                          `there were multiple or no 'export default' statements`);
  }
  let pos = routesNode[0].getChildAt(2).getChildAt(0).end; // openBracketLiteral
  // all routes in export route array
  let routesArray = routesNode[0].getChildAt(2).getChildAt(1)
                    .getChildren()
                    .filter(n => n.kind === ts.SyntaxKind.ObjectLiteralExpression);

  if (pathExists(routesArray, route, pathOptions.component)) {
    // don't duplicate routes
    throw new Error('Route was not added since it is a duplicate');
  }
  let isChild = false;
  // get parent to insert under
  let parent: ts.Node;
  if (pathOptions.parent) {
    // append '_' to route to find the actual parent (not parent of the parent)
    parent = getParent(routesArray, `${pathOptions.parent}/_`);
    if (!parent) {
      throw new Error(
        `You specified parent '${pathOptions.parent}'' which was not found in routes.ts`
      );
    }
    if (route.indexOf(pathOptions.parent) === 0) {
      route = route.substring(pathOptions.parent.length);
    }
  } else {
    parent = getParent(routesArray, route);
  }

  if (parent) {
    let childrenInfo = addChildPath(parent, pathOptions, route);
    if (!childrenInfo) {
      // path exists already
      throw new Error('Route was not added since it is a duplicate');
    }
    content = childrenInfo.newContent;
    pos = childrenInfo.pos;
    isChild = true;
  }

  let isFirstElement = routesArray.length === 0;
  if (!isChild) {
    let separator = isFirstElement ? '\n' : ',';
    content = `\n  ${content}${separator}`;
  }
  let changes: Change[] = [new InsertChange(routesFile, pos, content)];
  let component = originalComponent === pathOptions.component ? originalComponent :
                  `${originalComponent} as ${pathOptions.component}`;
  routePath = routePath.replace(/\\/, '/'); // correction in windows
  changes.push(insertImport(routesFile, component, routePath));
  return changes;
}


/**
 * Add more properties to the route object in routes.ts
 * @param routesFile routes.ts
 * @param routes Object {route: [key, value]}
 */
export function addItemsToRouteProperties(routesFile: string, routes: {[key: string]: string[]}) {
  let rootNode = getRootNode(routesFile);
  let routesNode = rootNode.getChildAt(0).getChildren().filter(n => {
    // get export statement
    return n.kind === ts.SyntaxKind.ExportAssignment &&
           n.getFullText().indexOf('export default') !== -1;
  });
  if (routesNode.length !== 1) {
    throw new Error('Did not insert path in routes.ts because ' +
                          `there were multiple or no 'export default' statements`);
  }
  let routesArray = routesNode[0].getChildAt(2).getChildAt(1)
                  .getChildren()
                  .filter(n => n.kind === ts.SyntaxKind.ObjectLiteralExpression);
  let changes: Change[] = Object.keys(routes).reduce((result, route) => {
    // let route = routes[guardName][0];
    let itemKey = routes[route][0];
    let itemValue = routes[route][1];
    let currRouteNode = getParent(routesArray, `${route}/_`);
    if (!currRouteNode) {
      throw new Error(`Could not find '${route}' in routes.ts`);
    }
    let fallBackPos = findNodes(currRouteNode, ts.SyntaxKind.CloseBraceToken).pop().pos;
    let pathPropertiesNodes = currRouteNode.getChildAt(1).getChildren()
                              .filter(n => n.kind === ts.SyntaxKind.PropertyAssignment);
    return result.concat([insertAfterLastOccurrence(pathPropertiesNodes,
      `, ${itemKey}: ${itemValue}`, routesFile, fallBackPos)]);
  }, []);
  return changes;
}

/**
 * Verifies that a component file exports a class of the component
 * @param file
 * @param componentName
 * @return whether file exports componentName
 */
export function confirmComponentExport (file: string, componentName: string): boolean {
  const rootNode = getRootNode(file);
  let exportNodes  = rootNode.getChildAt(0).getChildren().filter(n => {
    return n.kind === ts.SyntaxKind.ClassDeclaration &&
    (n.getChildren().filter((p: ts.Identifier) => p.text === componentName).length !== 0);
  });
  return exportNodes.length > 0;
}

/**
 * Ensures there is no collision between import names. If a collision occurs, resolve by adding
 * underscore number to the name
 * @param importName
 * @param importPath path to import component from
 * @param fileName (file to add import to)
 * @return resolved importName
 */
function resolveImportName (importName: string, importPath: string, fileName: string): string {
  const rootNode = getRootNode(fileName);
  // get all the import names
  let importNodes = rootNode.getChildAt(0).getChildren()
                        .filter(n => n.kind === ts.SyntaxKind.ImportDeclaration);
  // check if imported file is same as current one before updating component name
  let importNames = importNodes
    .reduce((a, b) => {
      let importFrom = findNodes(b, ts.SyntaxKind.StringLiteral); // there's only one
      if ((importFrom.pop() as ts.StringLiteral).text !== importPath) {
        // importing from different file, add to imported components to inspect
        // if only one identifier { FooComponent }, if two { FooComponent as FooComponent_1 }
        // choose last element of identifier array in both cases
        return a.concat([findNodes(b, ts.SyntaxKind.Identifier).pop()]);
      }
      return a;
    }, [])
    .map(n => n.text);

  const index = importNames.indexOf(importName);
  if (index === -1) {
    return importName;
  }
  const baseName = importNames[index].split('_')[0];
  let newName = baseName;
  let resolutionNumber = 1;
  while (importNames.indexOf(newName) !== -1) {
    newName = `${baseName}_${resolutionNumber}`;
    resolutionNumber++;
  }
  return newName;
}

/**
 * Resolve a path to a component file. If the path begins with path.sep, it is treated to be
 * absolute from the app/ directory. Otherwise, it is relative to currDir
 * @param projectRoot
 * @param currentDir
 * @param filePath componentName or path to componentName
 * @return component file name
 * @throw Error if component file referenced by path is not found
 */
export function resolveComponentPath(projectRoot: string, currentDir: string, filePath: string) {

  let parsedPath = path.parse(filePath);
  let componentName = parsedPath.base.split('.')[0];
  let componentDir = path.parse(parsedPath.dir).base;

  // correction for a case where path is /**/componentName/componentName(.component.ts)
  if ( componentName === componentDir) {
    filePath = parsedPath.dir;
  }
  if (parsedPath.dir === '') {
    // only component file name is given
    filePath = componentName;
  }
  let directory = filePath[0] === path.sep ?
    path.resolve(path.join(projectRoot, 'src', 'app', filePath)) :
    path.resolve(currentDir, filePath);

  if (!fs.existsSync(directory)) {
    throw new Error(`path '${filePath}' must be relative to current directory` +
                    ` or absolute from project root`);
  }
  if (directory.indexOf('src' + path.sep + 'app') === -1) {
    throw new Error('Route must be within app');
  }
  let componentFile = path.join(directory, `${componentName}.component.ts`);
  if (!fs.existsSync(componentFile)) {
    throw new Error(`could not find component file referenced by ${filePath}`);
  }
  return componentFile;
}

/**
 * Sort changes in decreasing order and apply them.
 * @param changes
 * @param host
 * @return Promise
 */
export function applyChanges(changes: Change[], host: Host = NodeHost): Promise<void> {
  return changes
    .filter(change => !!change)
    .sort((curr, next) => next.order - curr.order)
    .reduce((newChange, change) => newChange.then(() => change.apply(host)), Promise.resolve());
}
/**
 * Helper for addPathToRoutes. Adds child array to the appropriate position in the routes.ts file
 * @return Object (pos, newContent)
 */
function addChildPath (parentObject: ts.Node, pathOptions: any, route: string) {
  if (!parentObject) {
    return;
  }
  let pos: number;
  let newContent: string;

  // get object with 'children' property
  let childrenNode = parentObject.getChildAt(1).getChildren()
                    .filter(n =>
                      n.kind === ts.SyntaxKind.PropertyAssignment
                      && ((n as ts.PropertyAssignment).name as ts.Identifier).text === 'children');
  // find number of spaces to pad nested paths
  let nestingLevel = 1; // for indenting route object in the `children` array
  let n = parentObject;
  while (n.parent) {
    if (n.kind === ts.SyntaxKind.ObjectLiteralExpression
        || n.kind === ts.SyntaxKind.ArrayLiteralExpression) {
      nestingLevel ++;
    }
    n = n.parent;
  }

  // strip parent route
  let parentRoute = (parentObject.getChildAt(1).getChildAt(0).getChildAt(2) as ts.Identifier).text;
  let childRoute = route.substring(route.indexOf(parentRoute) + parentRoute.length + 1);

  let isDefault = pathOptions.isDefault ? ', useAsDefault: true' : '';
  let outlet = pathOptions.outlet ? `, outlet: '${pathOptions.outlet}'` : '';
  let content = `{ path: '${childRoute}', component: ${pathOptions.component}` +
                `${isDefault}${outlet} }`;
  let spaces = Array(2 * nestingLevel + 1).join(' ');

  if (childrenNode.length !== 0) {
    // add to beginning of children array
    pos = childrenNode[0].getChildAt(2).getChildAt(1).pos; // open bracket
    newContent = `\n${spaces}${content},`;
  } else {
    // no children array, add one
    pos = parentObject.getChildAt(2).pos; // close brace
    newContent = `,\n${spaces.substring(2)}children: [\n${spaces}${content}` +
                 `\n${spaces.substring(2)}]\n${spaces.substring(5)}`;
  }
  return {newContent: newContent, pos: pos};
}

/**
 * Helper for addPathToRoutes.
 * @return parentNode which contains the children array to add a new path to or
 *         undefined if none or the entire route was matched.
 */
function getParent(routesArray: ts.Node[], route: string, parent?: ts.Node): ts.Node {
  if (routesArray.length === 0 && !parent) {
    return; // no children array and no parent found
  }
  if (route.length === 0) {
    return; // route has been completely matched
  }
  let splitRoute = route.split('/');
  // don't treat positional parameters separately
  if (splitRoute.length > 1 && splitRoute[1].indexOf(':') !== -1) {
    let actualRoute = splitRoute.shift();
    splitRoute[0] = `${actualRoute}/${splitRoute[0]}`;
  }
  let potentialParents: ts.Node[] = routesArray // route nodes with same path as current route
                                    .filter(n => getValueForKey(n, 'path') === splitRoute[0]);
  if (potentialParents.length !== 0) {
    splitRoute.shift(); // matched current parent, move on
    route = splitRoute.join('/');
  }
  // get all children paths
  let newRouteArray = getChildrenArray(routesArray);
  if (route && parent && potentialParents.length === 0) {
    return parent; // final route is not matched. assign parent from here
  }
  parent = potentialParents.sort((a, b) => a.pos - b.pos).shift();
  return getParent(newRouteArray, route, parent);
}

/**
 * Helper for addPathToRoutes.
 * @return whether path with same route and component exists
 */
function pathExists(
  routesArray: ts.Node[],
  route: string,
  component: string,
  fullRoute?: string
): boolean {
  if (routesArray.length === 0) {
    return false;
  }
  fullRoute = fullRoute ? fullRoute : route;
  let sameRoute = false;
  let splitRoute = route.split('/');
  // don't treat positional parameters separately
  if (splitRoute.length > 1 && splitRoute[1].indexOf(':') !== -1) {
    let actualRoute = splitRoute.shift();
    splitRoute[0] = `${actualRoute}/${splitRoute[0]}`;
  }
  let repeatedRoutes: ts.Node[] = routesArray.filter(n => {
    let currentRoute = getValueForKey(n, 'path');
    let sameComponent = getValueForKey(n, 'component') === component;

    sameRoute = currentRoute === splitRoute[0];
    // Confirm that it's parents are the same
    if (sameRoute && sameComponent) {
      let path = currentRoute;
      let objExp = n.parent;
      while (objExp) {
        if (objExp.kind === ts.SyntaxKind.ObjectLiteralExpression) {
          let currentParentPath = getValueForKey(objExp, 'path');
          path = currentParentPath ? `${currentParentPath}/${path}` : path;
        }
        objExp = objExp.parent;
      }
      return path === fullRoute;
    }
    return false;
  });

  if (sameRoute) {
    splitRoute.shift(); // matched current parent, move on
    route = splitRoute.join('/');
  }
  if (repeatedRoutes.length !== 0) {
    return true; // new path will be repeating if inserted. report that path already exists
  }

  // all children paths
  let newRouteArray = getChildrenArray(routesArray);
  return pathExists(newRouteArray, route, component, fullRoute);
}

/**
 * Helper for getParent and pathExists
 * @return array with all nodes holding children array under routes
 *         in routesArray
 */
function getChildrenArray(routesArray: ts.Node[]): ts.Node[] {
  return routesArray.reduce((allRoutes, currRoute) => allRoutes.concat(
    currRoute.getChildAt(1).getChildren()
      .filter(n => n.kind === ts.SyntaxKind.PropertyAssignment
                && ((n as ts.PropertyAssignment).name as ts.Identifier).text === 'children')
      .map(n => n.getChildAt(2).getChildAt(1)) // syntaxList containing chilren paths
      .reduce((childrenArray, currChild) => childrenArray.concat(currChild.getChildren()
        .filter(p => p.kind === ts.SyntaxKind.ObjectLiteralExpression)
      ), [])
  ), []);
}

/**
 * Helper method to get the path text or component
 * @param objectLiteralNode
 * @param key 'path' or 'component'
 */
function getValueForKey(objectLiteralNode: ts.Node, key: string) {
  let currentNode = key === 'component' ? objectLiteralNode.getChildAt(1).getChildAt(2) :
                                    objectLiteralNode.getChildAt(1).getChildAt(0);
  return currentNode
    && currentNode.getChildAt(0)
    && (currentNode.getChildAt(0) as ts.Identifier).text === key
    && currentNode.getChildAt(2)
    && (currentNode.getChildAt(2) as ts.Identifier).text;
}

/**
 * Helper method to get AST from file
 * @param file
 */
function getRootNode(file: string) {
  return ts.createSourceFile(file, fs.readFileSync(file).toString(), ts.ScriptTarget.Latest, true);
}
