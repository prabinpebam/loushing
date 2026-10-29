import { readFileSync } from 'node:fs';

/** Evaluates only the JSON Schema vocabulary used by our versioned schemas. */
export function validateSchema(value, schema, root = schema, path = '$') {
  const errors = [];
  if (schema === true) return errors;
  if (schema === false) return [`${path}: not allowed`];
  const supported = new Set(['$ref', '$schema', '$id', '$defs', 'title', 'description', 'type', 'enum', 'const', 'oneOf', 'minLength', 'pattern', 'minimum', 'minItems', 'uniqueItems', 'items', 'required', 'properties', 'propertyNames', 'additionalProperties']);
  for (const keyword of Object.keys(schema)) if (!supported.has(keyword)) throw new Error(`Unsupported schema keyword: ${keyword}`);
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/')) throw new Error('Only local schema references are supported.');
    const target = schema.$ref.slice(2).split('/').reduce((node, key) => node?.[key], root);
    if (!target) throw new Error(`Unknown schema reference: ${schema.$ref}`);
    return validateSchema(value, target, root, path);
  }
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.oneOf && schema.oneOf.filter((choice) => validateSchema(value, choice, root, path).length === 0).length !== 1) errors.push(`${path}: expected exactly one allowed shape`);
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !types.includes(type) && !(types.includes('integer') && Number.isInteger(value))) return [`${path}: expected ${types.join(' or ')}`];
  if (schema.enum && !schema.enum.some((entry) => JSON.stringify(entry) === JSON.stringify(value))) errors.push(`${path}: unexpected value`);
  if (schema.const !== undefined && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push(`${path}: unexpected value`);
  if (type === 'string') {
    if (schema.minLength && value.length < schema.minLength) errors.push(`${path}: too short`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: invalid format`);
  }
  if (type === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
  if (type === 'array') {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${path}: too few items`);
    if (schema.uniqueItems && new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length) errors.push(`${path}: duplicate items`);
    if (schema.items !== undefined) value.forEach((entry, i) => errors.push(...validateSchema(entry, schema.items, root, `${path}[${i}]`)));
  }
  if (type === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    for (const [key, entry] of Object.entries(value)) {
      if (schema.propertyNames) errors.push(...validateSchema(key, schema.propertyNames, root, `${path} key`));
      const property = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : schema.additionalProperties;
      if (property !== undefined) errors.push(...validateSchema(entry, property, root, `${path}.${key}`));
    }
  }
  return errors;
}

export function outputSchema(name) {
  return JSON.parse(readFileSync(new URL(`../../../catalog/schema/${name}-1.json`, import.meta.url), 'utf8'));
}

export function assertOutput(name, value) {
  const errors = validateSchema(JSON.parse(JSON.stringify(value)), outputSchema(name));
  if (errors.length) throw new Error(`${name} schema: ${errors.join('; ')}`);
  return value;
}
