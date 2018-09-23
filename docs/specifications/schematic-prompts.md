# Schematic Prompts

Schematic prompts provide the ability to introduce user interaction into the schematic execution. The schematic runtime supports the ability to allow schematic options to be configured to display a customizable question to the user and then use the response as the value for the option.  These prompts are displayed before the execution of the schematic.  This allows users direct the operation of the schematic without requiring indepth knowledge of the full spectrum of options available to the user.

To enable this capability, the JSON Schema used to define the schematic's options supports extensions to allow the declarative definition of the prompts and their respective behavior.  No additional logic or changes are required to the JavaScript for a schematic to support the prompts.

## Basic Usage

To illustrate the addition of a prompt to an existing schematic the following example JSON schema for a hypothetical _hello world_ schematic will be used.

```json
{
    "properties": {
        "name": {
            "type": "string",
            "minLength": 1,
            "default": "world"
        },
        "useColor": {
            "type": "boolean"
        }
    }
}
```

Suppose it would be preferred if the user was asked for their name.  This can be accomplished by augmenting the `name` property definition with an `x-prompt` field.
```json
"x-prompt": "What is your name?"
```
In most cases, only the text of the prompt is required.  To minimize the amount of necessary configuration, the above _shorthand_ form is supported and will typically be all that is required.  Full details regarding the _longhand_ form can be found in the **Configuration Reference** section.

Adding a prompt to allow the user to decided whether the schematic will use color when executing its hello action is also very similar.  The schema with both prompts would be as follows:
```json
{
    "properties": {
        "name": {
            "type": "string",
            "minLength": 1,
            "default": "world",
            "x-prompt": "What is your name?"
        },
        "useColor": {
            "type": "boolean",
            "x-prompt": "Would you like the response in color?"
        }
    }
}
```

Prompts have several different types which provide the ability to display an input method that best represents the schematic option's potential values.

* `confirmation` - A **yes** or **no** question; ideal for boolean options
* `input` - textual input; ideal for string or number options
* `list` - a predefined set of items which may be selected

When using the _shorthand_ form, the most appropriate type will automatically be selected based on the property's schema.  In the example, the `name` prompt will use an `input` type because it it is a `string` property.  The `useColor` prompt will use a `confirmation` type because it is a boolean property with `yes` corresponding to `true` and `no` corresponding to `false`.

It is also important that the response from the user conforms to the contraints of the property.  By specifying constraints using the JSON schema, the prompt runtime will automatically validate the response provided by the user.  If the value is not acceptable, the user will be asked to enter a new value.  This ensures that any values passed to the schematic will meet the expectations of the schematic's implementation  and removes the need to add additional checks within the schematic's code.

##  Configuration Reference

The `x-prompt` field supports two alternatives to enable a prompt for a schematic option.  A shorthand form when additional customization is not required and a longhand form providing the ability for more control over the prompt.  All user responses are validated against the property's schema. For example, string type properties can use a minimum length or regular expression constraint to control the allowed values.  In the event the response fails validation, the user will be asked to enter a new value.

### Longhand Form

In the this form, the `x-prompt` field is an object with subfields that can be used to customize the behavior of the prompt.  Note that some fields only apply to specific prompt types.

| Field | Data Value | Default |
|-|-|-|
| `type` | `confirmation`, `input`, `list` | see shorthand section for details
| `message` | string | N/A (required)
| `items` | string and/or `label`/`value` object pair | only valid with type `list`


### Shorthand Form

`x-prompt` [type: string] --> Question to display to the user.

For this usage, the type of the prompt is determined by the type of the containing property.

| Property Schema  | Prompt Type | Notes |
|-|:-:|:-:|
| `"type": "boolean"` | `confirmation`  |   |
| `"type": "string"`  | `input`  |   |
| `"type": "number"`  | `input` | only valid numbers accepted  |
| `"type": "integer"` | `input` | only valid numbers accepted  |
| `"enum": [...]` | `list` | enum members become list selections

### `x-prompt` Schema

```json
{
    "oneOf": [
        { "type": "string" },
        {
            "type": "object",
            "properties": {
                "type": { "type": "string" },
                "message": { "type": "string" },
                "items": {
                    "type": "array",
                    "items": {
                        "oneOf": [
                            { "type": "string" },
                            {
                                "type": "object",
                                "properties": {
                                    "label": { "type": "string" },
                                    "value": { }
                                },
                                "required": [ "value" ]
                            }
                        ]
                    }
                }
            },
            "required": [ "message" ]
        }
    ]
}
```