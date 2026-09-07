import { z } from 'zod';

/**
 * Recursively patches any object that has `prefixItems` (tuple schema) to
 * include matching `minItems` / `maxItems` and `additionalItems: false`
 * so Fastify's Ajv strict mode does not reject the schema.
 */
function normalizeTupleItem(item: unknown): void {
  if (!item || typeof item !== 'object') return;
  const itemRec = item as Record<string, unknown>;
  const variants =
    (Array.isArray(itemRec.anyOf) ? itemRec.anyOf : undefined) ??
    (Array.isArray(itemRec.oneOf) ? itemRec.oneOf : undefined);
  if (!variants) return;

  const types: string[] = [];
  const enums: unknown[] = [];
  for (const variant of variants) {
    if (variant && typeof variant === 'object') {
      const vRec = variant as Record<string, unknown>;
      if (typeof vRec.type === 'string') types.push(vRec.type);
      if (Array.isArray(vRec.enum)) {
        for (const val of vRec.enum) enums.push(val);
      }
    }
  }

  if (types.length === 0) return;
  itemRec.type = types.length === 1 ? types[0] : types;
  if (enums.length > 0 && types.includes('null')) {
    itemRec.enum = [...enums, null];
  }
}

function patchTupleConstraints(rec: Record<string, unknown>, items: unknown[]): void {
  const len = items.length;
  if (rec.minItems === undefined || rec.maxItems === undefined) {
    rec.minItems = len;
    rec.maxItems = len;
    if (rec.additionalItems === undefined) {
      rec.additionalItems = false;
    }
  }
  for (const item of items) {
    normalizeTupleItem(item);
  }
}

/**
 * Recursively patches any object that has `prefixItems` (tuple schema) to
 * include matching `minItems` / `maxItems` and `additionalItems: false`
 * so Fastify's Ajv strict mode does not reject the schema.
 */
function fixTupleSchemas(obj: unknown): void {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) fixTupleSchemas(item);
    return;
  }
  const rec = obj as Record<string, unknown>;

  const items =
    (Array.isArray(rec.items) ? rec.items : undefined) ??
    (Array.isArray(rec.prefixItems) ? rec.prefixItems : undefined);

  if (items) {
    patchTupleConstraints(rec, items);
  }

  for (const [key, val] of Object.entries(rec)) {
    if ((key === 'items' || key === 'prefixItems') && Array.isArray(val)) continue;
    fixTupleSchemas(val);
  }
}

interface ZodWithNativeJsonSchema {
  toJSONSchema?: (schema: z.ZodType, options?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property and patches tuple schemas for Ajv strict mode.
 */
export function toJsonSchema(
  zodSchema: z.ZodType,
  _name?: string, // name is no longer needed for native conversion
): Record<string, unknown> {
  const zodNative = z as unknown as ZodWithNativeJsonSchema;
  if (typeof zodNative.toJSONSchema !== 'function') {
    throw new Error(
      'Zod version does not have native toJSONSchema support. Ensure Zod version matches project expectations.',
    );
  }

  // Use the static method with target: 'openApi3' to ensure descriptions/metadata are kept and formats are correct for Swagger
  const jsonSchema = zodNative.toJSONSchema(zodSchema, { target: 'openApi3' });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema: _, ...rest } = jsonSchema;

  // Patch tuple schemas: add minItems/maxItems for Fastify Ajv strict mode compatibility
  fixTupleSchemas(rest);

  return rest;
}
