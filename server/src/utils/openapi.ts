import { z } from 'zod';

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

  // Check for both older JSON Schema 'items' array and newer 'prefixItems'
  const items =
    (Array.isArray(rec.items) ? rec.items : undefined) ??
    (Array.isArray(rec.prefixItems) ? rec.prefixItems : undefined);

  if (items) {
    const len = items.length;
    if (rec.minItems === undefined || rec.maxItems === undefined) {
      console.log(`[FIX_TUPLE] Patching min/maxItems=${len} at items/prefixItems array`);
      rec.minItems = len;
      rec.maxItems = len;

      // AJV strict mode requires additionalItems: false for tuples
      if (rec.additionalItems === undefined) {
        rec.additionalItems = false;
      }
    }
  }

  // Recursively patch all properties and sub-schemas (including definitions, properties, items, etc.)
  for (const [key, val] of Object.entries(rec)) {
    // Avoid re-traversing the items we just evaluated as an array
    if (key === 'items' && Array.isArray(val)) continue;
    if (key === 'prefixItems' && Array.isArray(val)) continue;

    fixTupleSchemas(val);
  }
}

/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property and patches tuple schemas for Ajv strict mode.
 */
export function toJsonSchema(
  zodSchema: z.ZodType,
  _name?: string, // name is no longer needed for native conversion
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (z as any).toJSONSchema !== 'function') {
    throw new Error(
      'Zod version does not have native toJSONSchema support. Ensure Zod version matches project expectations.',
    );
  }

  // Use the static method with target: 'openApi3' to ensure descriptions/metadata are kept and formats are correct for Swagger
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = (z as any).toJSONSchema(zodSchema, { target: 'openApi3' }) as Record<
    string,
    unknown
  >;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema: _, ...rest } = jsonSchema;

  // Patch tuple schemas: add minItems/maxItems for Fastify Ajv strict mode compatibility
  fixTupleSchemas(rest);

  return rest;
}
