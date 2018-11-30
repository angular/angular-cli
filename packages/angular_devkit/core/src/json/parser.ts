/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../exception';
import {
  JsonArray,
  JsonAstArray,
  JsonAstComment,
  JsonAstConstantFalse,
  JsonAstConstantNull,
  JsonAstConstantTrue,
  JsonAstIdentifier,
  JsonAstKeyValue,
  JsonAstMultilineComment,
  JsonAstNode,
  JsonAstNumber,
  JsonAstObject,
  JsonAstString,
  JsonObject,
  JsonValue,
  Position,
} from './interface';

export class JsonException extends BaseException {}

/**
 * A character was invalid in this context.
 */
export class InvalidJsonCharacterException extends JsonException {
  invalidChar: string;
  line: number;
  character: number;
  offset: number;

  constructor(context: JsonParserContext) {
    const pos = context.previous;
    const invalidChar = JSON.stringify(_peek(context));
    super(`Invalid JSON character: ${invalidChar} at ${pos.line}:${pos.character}.`);

    this.invalidChar = invalidChar;
    this.line = pos.line;
    this.offset = pos.offset;
    this.character = pos.character;
  }
}


/**
 * More input was expected, but we reached the end of the stream.
 */
export class UnexpectedEndOfInputException extends JsonException {
  constructor(_context: JsonParserContext) {
    super(`Unexpected end of file.`);
  }
}

/**
 * An error happened within a file.
 */
export class PathSpecificJsonException extends JsonException {
  constructor(public path: string, public exception: JsonException) {
    super(`An error happened at file path ${JSON.stringify(path)}: ${exception.message}`);
  }
}

/**
 * Context passed around the parser with information about where we currently are in the parse.
 */
export interface JsonParserContext {
  position: Position;
  previous: Position;
  readonly original: string;
  readonly mode: JsonParseMode;
}


/**
 * Peek and return the next character from the context.
 * @private
 */
function _peek(context: JsonParserContext): string | undefined {
  return context.original[context.position.offset];
}


/**
 * Move the context to the next character, including incrementing the line if necessary.
 * @private
 */
function _next(context: JsonParserContext) {
  context.previous = context.position;

  let {offset, line, character} = context.position;
  const char = context.original[offset];
  offset++;
  if (char == '\n') {
    line++;
    character = 0;
  } else {
    character++;
  }
  context.position = {offset, line, character};
}


/**
 * Read a single character from the input. If a `valid` string is passed, validate that the
 * character is included in the valid string.
 * @private
 */
function _token(context: JsonParserContext, valid: string): string;
function _token(context: JsonParserContext): string | undefined;
function _token(context: JsonParserContext, valid?: string): string | undefined {
  const char = _peek(context);
  if (valid) {
    if (!char) {
      throw new UnexpectedEndOfInputException(context);
    }
    if (valid.indexOf(char) == -1) {
      throw new InvalidJsonCharacterException(context);
    }
  }

  // Move the position of the context to the next character.
  _next(context);

  return char;
}


/**
 * Read the exponent part of a number. The exponent part is looser for JSON than the number
 * part. `str` is the string of the number itself found so far, and start the position
 * where the full number started. Returns the node found.
 * @private
 */
function _readExpNumber(context: JsonParserContext,
                        start: Position,
                        str: string,
                        comments: (JsonAstComment | JsonAstMultilineComment)[]): JsonAstNumber {
  let char;
  let signed = false;

  while (true) {
    char = _token(context);
    if (char == '+' || char == '-') {
      if (signed) {
        break;
      }
      signed = true;
      str += char;
    } else if (char == '0' || char == '1' || char == '2' || char == '3' || char == '4'
        || char == '5' || char == '6' || char == '7' || char == '8' || char == '9') {
      signed = true;
      str += char;
    } else {
      break;
    }
  }

  // We're done reading this number.
  context.position = context.previous;

  return {
    kind: 'number',
    start,
    end: context.position,
    text: context.original.substring(start.offset, context.position.offset),
    value: Number.parseFloat(str),
    comments: comments,
  };
}


/**
 * Read the hexa part of a 0xBADCAFE hexadecimal number.
 * @private
 */
function _readHexaNumber(context: JsonParserContext,
                         isNegative: boolean,
                         start: Position,
                         comments: (JsonAstComment | JsonAstMultilineComment)[]): JsonAstNumber {
  // Read an hexadecimal number, until it's not hexadecimal.
  let hexa = '';
  const valid = '0123456789abcdefABCDEF';

  for (let ch = _peek(context); ch && valid.includes(ch); ch = _peek(context)) {
    // Add it to the hexa string.
    hexa += ch;
    // Move the position of the context to the next character.
    _next(context);
  }

  const value = Number.parseInt(hexa, 16);

  // We're done reading this number.
  return {
    kind: 'number',
    start,
    end: context.position,
    text: context.original.substring(start.offset, context.position.offset),
    value: isNegative ? -value : value,
    comments,
  };
}

/**
 * Read a number from the context.
 * @private
 */
function _readNumber(context: JsonParserContext, comments = _readBlanks(context)): JsonAstNumber {
  let str = '';
  let dotted = false;
  const start = context.position;

  // read until `e` or end of line.
  while (true) {
    const char = _token(context);

    // Read tokens, one by one.
    if (char == '-') {
      if (str != '') {
        throw new InvalidJsonCharacterException(context);
      }
    } else if (char == 'I'
        && (str == '-' || str == '' || str == '+')
        && (context.mode & JsonParseMode.NumberConstantsAllowed) != 0) {
      // Infinity?
      // _token(context, 'I'); Already read.
      _token(context, 'n');
      _token(context, 'f');
      _token(context, 'i');
      _token(context, 'n');
      _token(context, 'i');
      _token(context, 't');
      _token(context, 'y');

      str += 'Infinity';
      break;
    } else if (char == '0') {
      if (str == '0' || str == '-0') {
        throw new InvalidJsonCharacterException(context);
      }
    } else if (char == '1' || char == '2' || char == '3' || char == '4' || char == '5'
        || char == '6' || char == '7' || char == '8' || char == '9') {
      if (str == '0' || str == '-0') {
        throw new InvalidJsonCharacterException(context);
      }
    } else if (char == '+' && str == '') {
      // Pass over.
    } else if (char == '.') {
      if (dotted) {
        throw new InvalidJsonCharacterException(context);
      }
      dotted = true;
    } else if (char == 'e' || char == 'E') {
      return _readExpNumber(context, start, str + char, comments);
    } else if (char == 'x' && (str == '0' || str == '-0')
               && (context.mode & JsonParseMode.HexadecimalNumberAllowed) != 0) {
      return _readHexaNumber(context, str == '-0', start, comments);
    } else {
      // We read one too many characters, so rollback the last character.
      context.position = context.previous;
      break;
    }

    str += char;
  }

  // We're done reading this number.
  if (str.endsWith('.') && (context.mode & JsonParseMode.HexadecimalNumberAllowed) == 0) {
    throw new InvalidJsonCharacterException(context);
  }

  return {
    kind: 'number',
    start,
    end: context.position,
    text: context.original.substring(start.offset, context.position.offset),
    value: Number.parseFloat(str),
    comments,
  };
}


/**
 * Read a string from the context. Takes the comments of the string or read the blanks before the
 * string.
 * @private
 */
function _readString(context: JsonParserContext, comments = _readBlanks(context)): JsonAstString {
  const start = context.position;

  // Consume the first string delimiter.
  const delim = _token(context);
  if ((context.mode & JsonParseMode.SingleQuotesAllowed) == 0) {
    if (delim == '\'') {
      throw new InvalidJsonCharacterException(context);
    }
  }

  let str = '';
  while (true) {
    let char = _token(context);
    if (char == delim) {
      return {
        kind: 'string',
        start,
        end: context.position,
        text: context.original.substring(start.offset, context.position.offset),
        value: str,
        comments: comments,
      };
    } else if (char == '\\') {
      char = _token(context);
      switch (char) {
        case '\\':
        case '\/':
        case '"':
        case delim:
          str += char;
          break;

        case 'b': str += '\b'; break;
        case 'f': str += '\f'; break;
        case 'n': str += '\n'; break;
        case 'r': str += '\r'; break;
        case 't': str += '\t'; break;
        case 'u':
          const [c0] = _token(context, '0123456789abcdefABCDEF');
          const [c1] = _token(context, '0123456789abcdefABCDEF');
          const [c2] = _token(context, '0123456789abcdefABCDEF');
          const [c3] = _token(context, '0123456789abcdefABCDEF');
          str += String.fromCharCode(parseInt(c0 + c1 + c2 + c3, 16));
          break;

        case undefined:
          throw new UnexpectedEndOfInputException(context);

        case '\n':
          // Only valid when multiline strings are allowed.
          if ((context.mode & JsonParseMode.MultiLineStringAllowed) == 0) {
            throw new InvalidJsonCharacterException(context);
          }
          str += char;
          break;

        default:
          throw new InvalidJsonCharacterException(context);
      }
    } else if (char === undefined) {
      throw new UnexpectedEndOfInputException(context);
    } else if (char == '\b' || char == '\f' || char == '\n' || char == '\r' || char == '\t') {
      throw new InvalidJsonCharacterException(context);
    } else {
      str += char;
    }
  }
}


/**
 * Read the constant `true` from the context.
 * @private
 */
function _readTrue(context: JsonParserContext,
                   comments = _readBlanks(context)): JsonAstConstantTrue {
  const start = context.position;
  _token(context, 't');
  _token(context, 'r');
  _token(context, 'u');
  _token(context, 'e');

  const end = context.position;

  return {
    kind: 'true',
    start,
    end,
    text: context.original.substring(start.offset, end.offset),
    value: true,
    comments,
  };
}


/**
 * Read the constant `false` from the context.
 * @private
 */
function _readFalse(context: JsonParserContext,
                    comments = _readBlanks(context)): JsonAstConstantFalse {
  const start = context.position;
  _token(context, 'f');
  _token(context, 'a');
  _token(context, 'l');
  _token(context, 's');
  _token(context, 'e');

  const end = context.position;

  return {
    kind: 'false',
    start,
    end,
    text: context.original.substring(start.offset, end.offset),
    value: false,
    comments,
  };
}


/**
 * Read the constant `null` from the context.
 * @private
 */
function _readNull(context: JsonParserContext,
                   comments = _readBlanks(context)): JsonAstConstantNull {
  const start = context.position;

  _token(context, 'n');
  _token(context, 'u');
  _token(context, 'l');
  _token(context, 'l');

  const end = context.position;

  return {
    kind: 'null',
    start,
    end,
    text: context.original.substring(start.offset, end.offset),
    value: null,
    comments: comments,
  };
}


/**
 * Read the constant `NaN` from the context.
 * @private
 */
function _readNaN(context: JsonParserContext,
                  comments = _readBlanks(context)): JsonAstNumber {
  const start = context.position;

  _token(context, 'N');
  _token(context, 'a');
  _token(context, 'N');

  const end = context.position;

  return {
    kind: 'number',
    start,
    end,
    text: context.original.substring(start.offset, end.offset),
    value: NaN,
    comments: comments,
  };
}


/**
 * Read an array of JSON values from the context.
 * @private
 */
function _readArray(context: JsonParserContext, comments = _readBlanks(context)): JsonAstArray {
  const start = context.position;

  // Consume the first delimiter.
  _token(context, '[');
  const value: JsonArray = [];
  const elements: JsonAstNode[] = [];

  _readBlanks(context);
  if (_peek(context) != ']') {
    const node = _readValue(context);
    elements.push(node);
    value.push(node.value);
  }

  while (_peek(context) != ']') {
    _token(context, ',');

    const valueComments = _readBlanks(context);
    if ((context.mode & JsonParseMode.TrailingCommasAllowed) !== 0 && _peek(context) === ']') {
      break;
    }
    const node = _readValue(context, valueComments);
    elements.push(node);
    value.push(node.value);
  }

  _token(context, ']');

  return {
    kind: 'array',
    start,
    end: context.position,
    text: context.original.substring(start.offset, context.position.offset),
    value,
    elements,
    comments,
  };
}


/**
 * Read an identifier from the context. An identifier is a valid JavaScript identifier, and this
 * function is only used in Loose mode.
 * @private
 */
function _readIdentifier(context: JsonParserContext,
                         comments = _readBlanks(context)): JsonAstIdentifier {
  const start = context.position;

  let char = _peek(context);
  if (char && '0123456789'.indexOf(char) != -1) {
    const identifierNode = _readNumber(context);

    return {
      kind: 'identifier',
      start,
      end: identifierNode.end,
      text: identifierNode.text,
      value: identifierNode.value.toString(),
    };
  }

  const identValidFirstChar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ';
  const identValidChar = '_$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ0123456789';
  let first = true;
  let value = '';

  while (true) {
    char = _token(context);
    if (char == undefined
        || (first ? identValidFirstChar.indexOf(char) : identValidChar.indexOf(char)) == -1) {
      context.position = context.previous;

      return {
        kind: 'identifier',
        start,
        end: context.position,
        text: context.original.substr(start.offset, context.position.offset),
        value,
        comments,
      };
    }

    value += char;
    first = false;
  }
}


/**
 * Read a property from the context. A property is a string or (in Loose mode only) a number or
 * an identifier, followed by a colon `:`.
 * @private
 */
function _readProperty(context: JsonParserContext,
                       comments = _readBlanks(context)): JsonAstKeyValue {
  const start = context.position;

  let key;
  if ((context.mode & JsonParseMode.IdentifierKeyNamesAllowed) != 0) {
    const top = _peek(context);
    if (top == '"' || top == '\'') {
      key = _readString(context);
    } else {
      key = _readIdentifier(context);
    }
  } else {
    key = _readString(context);
  }

  _readBlanks(context);
  _token(context, ':');
  const value = _readValue(context);
  const end = context.position;

  return {
    kind: 'keyvalue',
    key,
    value,
    start,
    end,
    text: context.original.substring(start.offset, end.offset),
    comments,
  };
}


/**
 * Read an object of properties -> JSON values from the context.
 * @private
 */
function _readObject(context: JsonParserContext,
                     comments = _readBlanks(context)): JsonAstObject {
  const start = context.position;
  // Consume the first delimiter.
  _token(context, '{');
  const value: JsonObject = {};
  const properties: JsonAstKeyValue[] = [];

  _readBlanks(context);
  if (_peek(context) != '}') {
    const property = _readProperty(context);
    value[property.key.value] = property.value.value;
    properties.push(property);

    while (_peek(context) != '}') {
      _token(context, ',');

      const propertyComments = _readBlanks(context);
      if ((context.mode & JsonParseMode.TrailingCommasAllowed) !== 0 && _peek(context) === '}') {
        break;
      }
      const property = _readProperty(context, propertyComments);
      value[property.key.value] = property.value.value;
      properties.push(property);
    }
  }

  _token(context, '}');

  return {
    kind: 'object',
    properties,
    start,
    end: context.position,
    value,
    text: context.original.substring(start.offset, context.position.offset),
    comments,
  };
}


/**
 * Remove any blank character or comments (in Loose mode) from the context, returning an array
 * of comments if any are found.
 * @private
 */
function _readBlanks(context: JsonParserContext): (JsonAstComment | JsonAstMultilineComment)[] {
  if ((context.mode & JsonParseMode.CommentsAllowed) != 0) {
    const comments: (JsonAstComment | JsonAstMultilineComment)[] = [];
    while (true) {
      const char = context.original[context.position.offset];
      if (char == '/' && context.original[context.position.offset + 1] == '*') {
        const start = context.position;
        // Multi line comment.
        _next(context);
        _next(context);

        while (context.original[context.position.offset] != '*'
            || context.original[context.position.offset + 1] != '/') {
          _next(context);
          if (context.position.offset >= context.original.length) {
            throw new UnexpectedEndOfInputException(context);
          }
        }
        // Remove "*/".
        _next(context);
        _next(context);

        comments.push({
          kind: 'multicomment',
          start,
          end: context.position,
          text: context.original.substring(start.offset, context.position.offset),
          content: context.original.substring(start.offset + 2, context.position.offset - 2),
        });
      } else if (char == '/' && context.original[context.position.offset + 1] == '/') {
        const start = context.position;
        // Multi line comment.
        _next(context);
        _next(context);

        while (context.original[context.position.offset] != '\n') {
          _next(context);
          if (context.position.offset >= context.original.length) {
            break;
          }
        }

        // Remove "\n".
        if (context.position.offset < context.original.length) {
          _next(context);
        }
        comments.push({
          kind: 'comment',
          start,
          end: context.position,
          text: context.original.substring(start.offset, context.position.offset),
          content: context.original.substring(start.offset + 2, context.position.offset - 1),
        });
      } else if (char == ' ' || char == '\t' || char == '\n' || char == '\r' || char == '\f') {
        _next(context);
      } else {
        break;
      }
    }

    return comments;
  } else {
    let char = context.original[context.position.offset];
    while (char == ' ' || char == '\t' || char == '\n' || char == '\r' || char == '\f') {
      _next(context);
      char = context.original[context.position.offset];
    }

    return [];
  }
}


/**
 * Read a JSON value from the context, which can be any form of JSON value.
 * @private
 */
function _readValue(context: JsonParserContext, comments = _readBlanks(context)): JsonAstNode {
  let result: JsonAstNode;

  // Clean up before.
  const char = _peek(context);
  switch (char) {
    case undefined:
      throw new UnexpectedEndOfInputException(context);

    case '-':
    case '0':
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '7':
    case '8':
    case '9':
      result = _readNumber(context, comments);
      break;

    case '.':
    case '+':
      if ((context.mode & JsonParseMode.LaxNumberParsingAllowed) == 0) {
        throw new InvalidJsonCharacterException(context);
      }
      result = _readNumber(context, comments);
      break;

    case '\'':
    case '"':
      result = _readString(context, comments);
      break;

    case 'I':
      if ((context.mode & JsonParseMode.NumberConstantsAllowed) == 0) {
        throw new InvalidJsonCharacterException(context);
      }
      result = _readNumber(context, comments);
      break;

    case 'N':
      if ((context.mode & JsonParseMode.NumberConstantsAllowed) == 0) {
        throw new InvalidJsonCharacterException(context);
      }
      result = _readNaN(context, comments);
      break;

    case 't':
      result = _readTrue(context, comments);
      break;
    case 'f':
      result = _readFalse(context, comments);
      break;
    case 'n':
      result = _readNull(context, comments);
      break;

    case '[':
      result = _readArray(context, comments);
      break;

    case '{':
      result = _readObject(context, comments);
      break;

    default:
      throw new InvalidJsonCharacterException(context);
  }

  // Clean up after.
  _readBlanks(context);

  return result;
}


/**
 * The Parse mode used for parsing the JSON string.
 */
export enum JsonParseMode {
  Strict                    =      0,  // Standard JSON.
  CommentsAllowed           = 1 << 0,  // Allows comments, both single or multi lines.
  SingleQuotesAllowed       = 1 << 1,  // Allow single quoted strings.
  IdentifierKeyNamesAllowed = 1 << 2,  // Allow identifiers as objectp properties.
  TrailingCommasAllowed     = 1 << 3,
  HexadecimalNumberAllowed  = 1 << 4,
  MultiLineStringAllowed    = 1 << 5,
  LaxNumberParsingAllowed   = 1 << 6,  // Allow `.` or `+` as the first character of a number.
  NumberConstantsAllowed    = 1 << 7,  // Allow -Infinity, Infinity and NaN.

  Default                   = Strict,
  Loose                     = CommentsAllowed | SingleQuotesAllowed |
                              IdentifierKeyNamesAllowed | TrailingCommasAllowed |
                              HexadecimalNumberAllowed | MultiLineStringAllowed |
                              LaxNumberParsingAllowed | NumberConstantsAllowed,

  Json                      = Strict,
  Json5                     = Loose,
}


/**
 * Parse the JSON string and return its AST. The AST may be losing data (end comments are
 * discarded for example, and space characters are not represented in the AST), but all values
 * will have a single node in the AST (a 1-to-1 mapping).
 * @param input The string to use.
 * @param mode The mode to parse the input with. {@see JsonParseMode}.
 * @returns {JsonAstNode} The root node of the value of the AST.
 */
export function parseJsonAst(input: string, mode = JsonParseMode.Default): JsonAstNode {
  if (mode == JsonParseMode.Default) {
    mode = JsonParseMode.Strict;
  }

  const context = {
    position: { offset: 0, line: 0, character: 0 },
    previous: { offset: 0, line: 0, character: 0 },
    original: input,
    comments: undefined,
    mode,
  };

  const ast = _readValue(context);
  if (context.position.offset < input.length) {
    const rest = input.substr(context.position.offset);
    const i = rest.length > 20 ? rest.substr(0, 20) + '...' : rest;
    throw new Error(`Expected end of file, got "${i}" at `
        + `${context.position.line}:${context.position.character}.`);
  }

  return ast;
}


/**
 * Options for the parseJson() function.
 */
export interface ParseJsonOptions {
  /**
   * If omitted, will only emit errors related to the content of the JSON. If specified, any
   * JSON errors will also include the path of the file that caused the error.
   */
  path?: string;
}


/**
 * Parse a JSON string into its value.  This discards the AST and only returns the value itself.
 *
 * If a path option is pass, it also absorbs JSON parsing errors and return a new error with the
 * path in it. Useful for showing errors when parsing from a file.
 *
 * @param input The string to parse.
 * @param mode The mode to parse the input with. {@see JsonParseMode}.
 * @param options Additional optinos for parsing.
 * @returns {JsonValue} The value represented by the JSON string.
 */
export function parseJson(
  input: string,
  mode = JsonParseMode.Default,
  options?: ParseJsonOptions,
): JsonValue {
  try {
    // Try parsing for the fastest path available, if error, uses our own parser for better errors.
    if (mode == JsonParseMode.Strict) {
      try {
        return JSON.parse(input);
      } catch (err) {
        return parseJsonAst(input, mode).value;
      }
    }

    return parseJsonAst(input, mode).value;
  } catch (e) {
    if (options && options.path && e instanceof JsonException) {
      throw new PathSpecificJsonException(options.path, e);
    }
    throw e;
  }
}
