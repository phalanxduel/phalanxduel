import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property usually added by zod-to-json-schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toJsonSchema(zodSchema: any, name?: string): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, name);
  if (jsonSchema && typeof jsonSchema === 'object' && !Array.isArray(jsonSchema)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const { $schema: _, ...rest } = jsonSchema as any;
    return rest as Record<string, unknown>;
  }
  return jsonSchema as unknown as Record<string, unknown>;
}
