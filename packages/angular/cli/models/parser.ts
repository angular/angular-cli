/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 */
import { BaseException, logging, strings } from '@angular-devkit/core';
import * as parser from 'yargs-parser';
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

function coerce(
  value: Value | undefined,
  types: OptionType[] = [OptionType.Any],
): Value | undefined {
  if (Array.isArray(value)) {
    if (types.some(t => t === OptionType.Array || t === OptionType.Any)) {
      return value;
    }

    const newValue = value.pop();

    return newValue === undefined
      ? newValue
      : coerce(newValue, types);
  }

  if (types.includes(OptionType.Boolean)) {
    switch (value) {
      case 'true':
      case true:
      case '':
        return true;
      case 'false':
      case false:
        return false;
    }
  }

  if (types.includes(OptionType.Number)) {
    if (value === true || value === undefined) {
      return 0;
    }

    if (Number.isFinite(+value)) {
      return +value;
    }
  }

  if (types.includes(OptionType.String)) {
    if (value === true) {
      return '';
    }

    return `${value}`;
  }

  if (types.includes(OptionType.Any)) {
    switch (value) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return value;
    }
  }

  return undefined;
}
/**
 * Parse the arguments in a consistent way, from a list of standardized options.
 * The result object will have a key per option name and `--` will contain everything that did not match.
 * When providing options any key that don't have an option will be pushed back in `--` and removed from the object.
 * If you need to validate that there's no additionalProperties, you need to check the `--` key.
 *
 * @param args The argument array to parse.
 * @param options List of supported options. {@see Option}.
 * @param logger Logger to use to warn users.
 * @returns An object that contains a property per option.
 */
export function parseArguments(
  args: string[],
  options?: Option[],
  logger?: logging.Logger,
): Arguments {
  const optionsMapped: Record<string, Option & { types: OptionType[] }> = {};
  const alias: Record<string, string[]> = {};
  const positionalOptions: string[] = [];
  const ignored: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const typedOptions: Record<Exclude<OptionType, 'any'>, string[]> = {
    string: [],
    number: [],
    boolean: [],
    array: [],
  };

  for (const option of options || []) {
    const { aliases, name, types, type, positional } = option;
    const optionTypes = types || [type];
    if (optionTypes.includes(OptionType.Array)) {
      typedOptions[OptionType.Array].push(name);
    } else if (optionTypes.length === 1) {
      switch (type) {
        case OptionType.Number:
        case OptionType.String:
        case OptionType.Boolean:
          typedOptions[type].push(name);
          break;
      }
    }

    if (positional !== undefined) {
      positionalOptions[positional] = name;
    }

    // We set even those without an alias, so we make the option 'known' to the parser.
    alias[name] = aliases;
    optionsMapped[name] = {
      ...option,
      types: optionTypes,
    };
  }

  const transformedArgs = args.map(a => a.startsWith('--no') ? strings.dasherize(a) : a);
  const { _: positional, ...parsedOptions } = parser(transformedArgs, {
    alias,
    ...typedOptions,
    configuration: {
      // We enable this so that later on we can show a warning that an option
      // was provided multiple times and coerced into the last one
      'duplicate-arguments-array': true,
      'strip-aliased': true,
      'strip-dashed': true,
      'dot-notation': true,
      'unknown-options-as-args': !!options,
    } as parser.Configuration & { 'unknown-options-as-args'?: boolean },
  });

  // Positional and unknown
  const unknownArgs = [...positional];
  for (let index = 0; index < positional.length; index++) {
    const arg = positional[index];
    const name = positionalOptions[index];
    if (name && parsedOptions[name] === undefined && !arg.startsWith('-')) {
      parsedOptions[name] = arg;
      unknownArgs.shift();
      continue;
    }

    break;
  }

  // Coerce and validate
  for (const name in parsedOptions) {
    const value = parsedOptions[name];
    const option = optionsMapped[name];

    if (!option) {
      parsedOptions[name] = coerce(value);
      continue;
    }

    const { types, deprecated, enums } = option;
    const coercedValue = coerce(value, types);
    parsedOptions[name] = coercedValue;

    if (Array.isArray(value) && !Array.isArray(coercedValue) && value[0] !== coercedValue) {
      warnings.push(
        `Option ${JSON.stringify(name)} was already specified with value `
        + `${JSON.stringify(value)}. The new value ${JSON.stringify(coercedValue)} `
        + `will override it.`,
      );
    }

    // Validate enums
    if (coercedValue === undefined || (enums && !enums.includes(coercedValue))) {
      let error = `Argument ${name} could not be parsed using value ${JSON.stringify(value)}.`;
      if (enums) {
        error += ` Valid values are: ${enums.map(x => JSON.stringify(x)).join(', ')}.`;
      } else {
        error += `Valid type(s) is: ${types.join(', ')}`;
      }

      ignored.push(name);
      errors.push(error);
      delete parsedOptions[name];
    }

    // todo: the below should be handled in the schema validation ideally
    // so that we can also show deprecation warnings when the option is used in the configuration file.
    if (deprecated) {
      warnings.push(`Option ${JSON.stringify(name)} is deprecated${
        typeof deprecated == 'string' ? ': ' + deprecated : '.'}`);
    }
  }

  if (unknownArgs.length) {
    parsedOptions['--'] = unknownArgs;
  }

  if (warnings.length && logger) {
    warnings.forEach(message => logger.warn(message));
  }

  if (errors.length) {
    throw new ParseArgumentException(errors, parsedOptions, ignored);
  }

  return parsedOptions;
}
