import { z } from 'zod';

/**
 * Recursively patches any object that has `prefixItems` (tuple schema) to
 * include matching `minItems` / `maxItems` so Fastify's Ajv strict mode
 * does not reject the schema.
 */
function fixTupleSchemas(obj: unknown): void {
  if (obj === null || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) fixTupleSchemas(item);
    return;
  }
  const rec = obj as Record<string, unknown>;
  if (Array.isArray(rec.prefixItems)) {
    const len = rec.prefixItems.length;
    if (rec.minItems === undefined) rec.minItems = len;
    if (rec.maxItems === undefined) rec.maxItems = len;
  }
  for (const val of Object.values(rec)) {
    fixTupleSchemas(val);
  }
}

/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property and patches tuple schemas for Ajv strict mode.
 */
export function toJsonSchema(
  zodSchema: z.ZodTypeAny,
  _name?: string, // name is no longer needed for native conversion
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  if (typeof (z as any).toJSONSchema !== 'function') {
    throw new Error(
      'Zod version does not have native toJSONSchema support. Ensure Zod version matches project expectations.',
    );
  }

  // Use the static method with target: 'openApi3' to ensure descriptions/metadata are kept and formats are correct for Swagger
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
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
