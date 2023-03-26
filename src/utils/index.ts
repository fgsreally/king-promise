import { Validator } from "schema-validator";
export function validate(schema: any, obj: any, name: String, route: String) {
  if (!schema) return;
  var validator = new Validator(schema);
  var check = validator.check(obj);
  if (!check) {
    console.warn(`${name} in ${route} doesn't pass validator`);
  }
}

export function validator(schema: any, name: string, route: String) {
  return function (args: any) {
    if (!schema) return;
    var validator = new Validator(schema);
    var check = validator.check(args);
    if (!check) {
      console.warn(`${name} in ${route} doesn't pass validator`);
    }
  };
}
