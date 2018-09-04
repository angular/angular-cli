/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const STRING_DASHERIZE_REGEXP = (/[ _]/g);
const STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
const STRING_CAMELIZE_REGEXP = (/(-|_|\.|\s)+(.)?/g);
const STRING_UNDERSCORE_REGEXP_1 = (/([a-z\d])([A-Z]+)/g);
const STRING_UNDERSCORE_REGEXP_2 = (/-|\s+/g);

/**
 * Converts a camelized string into all lower case separated by underscores.
 *
 ```javascript
 decamelize('innerHTML');         // 'inner_html'
 decamelize('action_name');       // 'action_name'
 decamelize('css-class-name');    // 'css-class-name'
 decamelize('my favorite items'); // 'my favorite items'
 ```

 @method decamelize
 @param {String} str The string to decamelize.
 @return {String} the decamelized string.
 */
export function decamelize(str: string): string {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
}

/**
 Replaces underscores, spaces, or camelCase with dashes.

 ```javascript
 dasherize('innerHTML');         // 'inner-html'
 dasherize('action_name');       // 'action-name'
 dasherize('css-class-name');    // 'css-class-name'
 dasherize('my favorite items'); // 'my-favorite-items'
 ```

 @method dasherize
 @param {String} str The string to dasherize.
 @return {String} the dasherized string.
 */
export function dasherize(str: string): string {
  return decamelize(str).replace(STRING_DASHERIZE_REGEXP, '-');
}

/**
 Returns the lowerCamelCase form of a string.

 ```javascript
 camelize('innerHTML');          // 'innerHTML'
 camelize('action_name');        // 'actionName'
 camelize('css-class-name');     // 'cssClassName'
 camelize('my favorite items');  // 'myFavoriteItems'
 camelize('My Favorite Items');  // 'myFavoriteItems'
 ```

 @method camelize
 @param {String} str The string to camelize.
 @return {String} the camelized string.
 */
export function camelize(str: string): string {
  return str
    .replace(STRING_CAMELIZE_REGEXP, (_match: string, _separator: string, chr: string) => {
      return chr ? chr.toUpperCase() : '';
    })
    .replace(/^([A-Z])/, (match: string) => match.toLowerCase());
}

/**
 Returns the UpperCamelCase form of a string.

 ```javascript
 'innerHTML'.classify();          // 'InnerHTML'
 'action_name'.classify();        // 'ActionName'
 'css-class-name'.classify();     // 'CssClassName'
 'my favorite items'.classify();  // 'MyFavoriteItems'
 ```

 @method classify
 @param {String} str the string to classify
 @return {String} the classified string
 */
export function classify(str: string): string {
  return str.split('.').map(part => capitalize(camelize(part))).join('.');
}

/**
 More general than decamelize. Returns the lower\_case\_and\_underscored
 form of a string.

 ```javascript
 'innerHTML'.underscore();          // 'inner_html'
 'action_name'.underscore();        // 'action_name'
 'css-class-name'.underscore();     // 'css_class_name'
 'my favorite items'.underscore();  // 'my_favorite_items'
 ```

 @method underscore
 @param {String} str The string to underscore.
 @return {String} the underscored string.
 */
export function underscore(str: string): string {
  return str
    .replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2')
    .replace(STRING_UNDERSCORE_REGEXP_2, '_')
    .toLowerCase();
}

/**
 Returns the Capitalized form of a string

 ```javascript
 'innerHTML'.capitalize()         // 'InnerHTML'
 'action_name'.capitalize()       // 'Action_name'
 'css-class-name'.capitalize()    // 'Css-class-name'
 'my favorite items'.capitalize() // 'My favorite items'
 ```

 @method capitalize
 @param {String} str The string to capitalize.
 @return {String} The capitalized string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

/**
 * Calculate the levenshtein distance of two strings.
 * See https://en.wikipedia.org/wiki/Levenshtein_distance.
 * Based off https://gist.github.com/andrei-m/982927 (for using the faster dynamic programming
 * version).
 *
 * @param a String a.
 * @param b String b.
 * @returns A number that represents the distance between the two strings. The greater the number
 *   the more distant the strings are from each others.
 */
export function levenshtein(a: string, b: string): number {
  if (a.length == 0) {
    return b.length;
  }
  if (b.length == 0) {
    return a.length;
  }

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
