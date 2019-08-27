/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { BaseException, logging, strings } from '@angular-devkit/core';
import { Arguments, Option, OptionType, Value } from './interface';


export class ParseArgumentException extends BaseException {
  constructor(
    public readonly comments: string[],
    public readonly parsed: Arguments,
    public readonly ignored: string[],
  ) {
    super(`One or more errors occurred while parsing arguments:\n  ${comments.join('\n  ')}`);
  }
}


function _coerceType(str: string | undefined, type: OptionType, v?: Value): Value | undefined {
  switch (type) {
    case OptionType.Any:
      if (Array.isArray(v)) {
        return v.concat(str || '');
      }

      return _coerceType(str, OptionType.Boolean, v) !== undefined
        ? _coerceType(str, OptionType.Boolean, v)
        : _coerceType(str, OptionType.Number, v) !== undefined
          ? _coerceType(str, OptionType.Number, v)
          : _coerceType(str, OptionType.String, v);

    case OptionType.String:
      return str || '';

    case OptionType.Boolean:
      switch (str) {
        case 'false':
          return false;

        case undefined:
        case '':
        case 'true':
          return true;

        default:
          return undefined;
      }

    case OptionType.Number:
      if (str === undefined) {
        return 0;
      } else if (str === '') {
        return undefined;
      } else if (Number.isFinite(+str)) {
        return +str;
      } else {
        return undefined;
      }

    case OptionType.Array:
      return Array.isArray(v)
        ? v.concat(str || '')
        : v === undefined
          ? [str || '']
          : [v + '', str || ''];

    default:
      return undefined;
  }
}

function _coerce(str: string | undefined, o: Option | null, v?: Value): Value | undefined {
  if (!o) {
    return _coerceType(str, OptionType.Any, v);
  } else {
    const types = o.types || [o.type];

    // Try all the types one by one and pick the first one that returns a value contained in the
    // enum. If there's no enum, just return the first one that matches.
    for (const type of types) {
      const maybeResult = _coerceType(str, type, v);
      if (maybeResult !== undefined && (!o.enum || o.enum.includes(maybeResult))) {
        return maybeResult;
      }
    }

    return undefined;
  }
}


function _getOptionFromName(name: string, options: Option[]): Option | undefined {
  const camelName = /(-|_)/.test(name)
    ? strings.camelize(name)
    : name;

  for (const option of options) {
    if (option.name === name || option.name === camelName) {
      return option;
    }

    if (option.aliases.some(x => x === name || x === camelName)) {
      return option;
    }
  }

  return undefined;
}

function _removeLeadingDashes(key: string): string {
  const from = key.startsWith('--') ? 2 : key.startsWith('-') ? 1 : 0;

  return key.substr(from);
}

function _assignOption(
  arg: string,
  nextArg: string | undefined,
  { options, parsedOptions, leftovers, ignored, errors, warnings }: {
    options: Option[],
    parsedOptions: Arguments,
    positionals: string[],
    leftovers: string[],
    ignored: string[],
    errors: string[],
    warnings: string[],
  },
) {
  const from = arg.startsWith('--') ? 2 : 1;
  let consumedNextArg = false;
  let key = arg.substr(from);
  let option: Option | null = null;
  let value: string | undefined = '';
  const i = arg.indexOf('=');

  // If flag is --no-abc AND there's no equal sign.
  if (i == -1) {
    if (key.startsWith('no')) {
      // Only use this key if the option matching the rest is a boolean.
      const from = key.startsWith('no-') ? 3 : 2;
      const maybeOption = _getOptionFromName(strings.camelize(key.substr(from)), options);
      if (maybeOption && maybeOption.type == 'boolean') {
        value = 'false';
        option = maybeOption;
      }
    }

    if (option === null) {
      // Set it to true if it's a boolean and the next argument doesn't match true/false.
      const maybeOption = _getOptionFromName(key, options);
      if (maybeOption) {
        value = nextArg;
        let shouldShift = true;

        if (value && value.startsWith('-') && _coerce(undefined, maybeOption) !== undefined) {
          // Verify if not having a value results in a correct parse, if so don't shift.
          shouldShift = false;
        }

        // Only absorb it if it leads to a better value.
        if (shouldShift && _coerce(value, maybeOption) !== undefined) {
          consumedNextArg = true;
        } else {
          value = '';
        }
        option = maybeOption;
      }
    }
  } else {
    key = arg.substring(0, i);
    option = _getOptionFromName(_removeLeadingDashes(key), options) || null;
    if (option) {
      value = arg.substring(i + 1);
    }
  }

  if (option === null) {
    if (nextArg && !nextArg.startsWith('-')) {
      leftovers.push(arg, nextArg);
      consumedNextArg = true;
    } else {
      leftovers.push(arg);
    }
  } else {
    const v = _coerce(value, option, parsedOptions[option.name]);
    if (v !== undefined) {
      if (parsedOptions[option.name] !== v) {
        if (parsedOptions[option.name] !== undefined) {
          warnings.push(
            `Option ${JSON.stringify(option.name)} was already specified with value `
            + `${JSON.stringify(parsedOptions[option.name])}. The new value ${JSON.stringify(v)} `
            + `will override it.`,
          );
        }

        parsedOptions[option.name] = v;

        if (option.deprecated !== undefined && option.deprecated !== false) {
          warnings.push(`Option ${JSON.stringify(option.name)} is deprecated${
            typeof option.deprecated == 'string' ? ': ' + option.deprecated : '.'}`);
        }
      }
    } else {
      let error = `Argument ${key} could not be parsed using value ${JSON.stringify(value)}.`;
      if (option.enum) {
        error += ` Valid values are: ${option.enum.map(x => JSON.stringify(x)).join(', ')}.`;
      } else {
        error += `Valid type(s) is: ${(option.types || [option.type]).join(', ')}`;
      }

      errors.push(error);
      ignored.push(arg);
    }
  }

  return consumedNextArg;
}


/**
 * Parse the arguments in a consistent way, but without having any option definition. This tries
 * to assess what the user wants in a free form. For example, using `--name=false` will set the
 * name properties to a boolean type.
 * This should only be used when there's no schema available or if a schema is "true" (anything is
 * valid).
 *
 * @param args Argument list to parse.
 * @returns An object that contains a property per flags from the args.
 */
export function parseFreeFormArguments(args: string[]): Arguments {
  const parsedOptions: Arguments = {};
  const leftovers = [];

  for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
    if (arg == '--') {
      leftovers.push(...args);
      break;
    }

    if (arg.startsWith('--')) {
      const eqSign = arg.indexOf('=');
      let name: string;
      let value: string | undefined;
      if (eqSign !== -1) {
        name = arg.substring(2, eqSign);
        value = arg.substring(eqSign + 1);
      } else {
        name = arg.substr(2);
        value = args.shift();
      }

      const v = _coerce(value, null, parsedOptions[name]);
      if (v !== undefined) {
        parsedOptions[name] = v;
      }
    } else if (arg.startsWith('-')) {
      arg.split('').forEach(x => parsedOptions[x] = true);
    } else {
      leftovers.push(arg);
    }
  }

  if (leftovers.length) {
    parsedOptions['--'] = leftovers;
  }

  return parsedOptions;
}


/**
 * Parse the arguments in a consistent way, from a list of standardized options.
 * The result object will have a key per option name, with the `_` key reserved for positional
 * arguments, and `--` will contain everything that did not match. Any key that don't have an
 * option will be pushed back in `--` and removed from the object. If you need to validate that
 * there's no additionalProperties, you need to check the `--` key.
 *
 * @param args The argument array to parse.
 * @param options List of supported options. {@see Option}.
 * @param logger Logger to use to warn users.
 * @returns An object that contains a property per option.
 */
export function parseArguments(
  args: string[],
  options: Option[] | null,
  logger?: logging.Logger,
): Arguments {
  if (options === null) {
    options = [];
  }

  const leftovers: string[] = [];
  const positionals: string[] = [];
  const parsedOptions: Arguments = {};

  const ignored: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const state = { options, parsedOptions, positionals, leftovers, ignored, errors, warnings };

  for (let argIndex = 0; argIndex < args.length; argIndex++) {
    const arg = args[argIndex];
    let consumedNextArg = false;

    if (arg == '--') {
      // If we find a --, we're done.
      leftovers.push(...args.slice(argIndex + 1));
      break;
    }

    if (arg.startsWith('--')) {
      consumedNextArg = _assignOption(arg, args[argIndex + 1], state);
    } else if (arg.startsWith('-')) {
      // Argument is of form -abcdef.  Starts at 1 because we skip the `-`.
      for (let i = 1; i < arg.length; i++) {
        const flag = arg[i];
        // If the next character is an '=', treat it as a long flag.
        if (arg[i + 1] == '=') {
          const f = '-' + flag + arg.slice(i + 1);
          consumedNextArg = _assignOption(f, args[argIndex + 1], state);
          break;
        }
        // Treat the last flag as `--a` (as if full flag but just one letter). We do this in
        // the loop because it saves us a check to see if the arg is just `-`.
        if (i == arg.length - 1) {
          const arg = '-' + flag;
          consumedNextArg = _assignOption(arg, args[argIndex + 1], state);
        } else {
          const maybeOption = _getOptionFromName(flag, options);
          if (maybeOption) {
            const v = _coerce(undefined, maybeOption, parsedOptions[maybeOption.name]);
            if (v !== undefined) {
              parsedOptions[maybeOption.name] = v;
            }
          }
        }
      }
    } else {
      positionals.push(arg);
    }

    if (consumedNextArg) {
      argIndex++;
    }
  }

  // Deal with positionals.
  // TODO(hansl): this is by far the most complex piece of code in this file. Try to refactor it
  //   simpler.
  if (positionals.length > 0) {
    let pos = 0;
    for (let i = 0; i < positionals.length;) {
      let found = false;
      let incrementPos = false;
      let incrementI = true;

      // We do this with a found flag because more than 1 option could have the same positional.
      for (const option of options) {
        // If any option has this positional and no value, AND fit the type, we need to remove it.
        if (option.positional === pos) {
          const coercedValue = _coerce(positionals[i], option, parsedOptions[option.name]);
          if (parsedOptions[option.name] === undefined && coercedValue !== undefined) {
            parsedOptions[option.name] = coercedValue;
            found = true;
          } else {
            incrementI = false;
          }
          incrementPos = true;
        }
      }

      if (found) {
        positionals.splice(i--, 1);
      }
      if (incrementPos) {
        pos++;
      }
      if (incrementI) {
        i++;
      }
    }
  }

  if (positionals.length > 0 || leftovers.length > 0) {
    parsedOptions['--'] = [...positionals, ...leftovers];
  }

  if (warnings.length > 0 && logger) {
    warnings.forEach(message => logger.warn(message));
  }

  if (errors.length > 0) {
    throw new ParseArgumentException(errors, parsedOptions, ignored);
  }

  return parsedOptions;
}
