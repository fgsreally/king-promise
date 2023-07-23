import { Validator } from 'schema-validator'

export function validate(schema: any, obj: any, name: string, route: string) {
  if (!schema)
    return
  const validator = new Validator(schema)
  const check = validator.check(obj)
  if (!check)
    console.warn(`${name} in ${route} doesn't pass validator`)
}

export function validator(schema: any, name: string, route: string) {
  return function (args: any) {
    if (!schema)
      return
    const validator = new Validator(schema)
    const check = validator.check(args)
    if (!check)
      console.warn(`${name} in ${route} doesn't pass validator`)
  }
}
