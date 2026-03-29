import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property usually added by zod-to-json-schema.
 */
export function toJsonSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: any,
  name?: string,
): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, name) as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema: _, ...rest } = jsonSchema;
  return rest;
}
