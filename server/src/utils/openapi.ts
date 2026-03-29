/**
 * Converts a Zod schema to a JSON schema compatible with Fastify/Swagger.
 * Removes the $schema property.
 */
export function toJsonSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: any,
  _name?: string, // name is no longer needed for native conversion
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (typeof zodSchema.toJSONSchema !== 'function') {
    throw new Error(
      'Zod schema does not have native toJSONSchema support. Ensure Zod version matches project expectations.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const jsonSchema = zodSchema.toJSONSchema() as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema: _, ...rest } = jsonSchema;
  return rest;
}
