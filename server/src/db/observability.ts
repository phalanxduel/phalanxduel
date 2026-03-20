import { SpanKind, type Attributes } from '@opentelemetry/api';
import {
  ATTR_DB_COLLECTION_NAME,
  ATTR_DB_NAMESPACE,
  ATTR_DB_OPERATION_NAME,
  ATTR_DB_SYSTEM_NAME,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT,
} from '@opentelemetry/semantic-conventions';
import { withActiveSpan } from '../observability.js';

const DEFAULT_POSTGRES_PORT = 5432;

function resolveDatabaseTarget(): {
  database?: string;
  host?: string;
  port?: number;
} {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return {};

  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\/+/u, '') || undefined;
    return {
      database,
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : DEFAULT_POSTGRES_PORT,
    };
  } catch {
    return {};
  }
}

const databaseTarget = resolveDatabaseTarget();

function baseDatabaseAttributes(operation: string, table?: string): Attributes {
  return {
    ...(table ? { [ATTR_DB_COLLECTION_NAME]: table } : {}),
    [ATTR_DB_NAMESPACE]: databaseTarget.database,
    [ATTR_DB_OPERATION_NAME]: operation,
    [ATTR_DB_SYSTEM_NAME]: 'postgresql',
    // Keep the legacy attribute during rollout for backends that still key DB topology off it.
    'db.system': 'postgresql',
    [ATTR_SERVER_ADDRESS]: databaseTarget.host,
    ...(databaseTarget.port !== undefined ? { [ATTR_SERVER_PORT]: databaseTarget.port } : {}),
  };
}

export async function traceDbQuery<T>(
  spanName: string,
  options: {
    attributes?: Attributes;
    operation: string;
    table?: string;
  },
  fn: () => Promise<T> | T,
): Promise<T> {
  return withActiveSpan(
    spanName,
    {
      attributes: {
        ...baseDatabaseAttributes(options.operation, options.table),
        ...options.attributes,
      },
      kind: SpanKind.CLIENT,
    },
    () => fn(),
  );
}

export async function traceDbTransaction<T>(
  spanName: string,
  fn: () => Promise<T> | T,
  attributes: Attributes = {},
): Promise<T> {
  return traceDbQuery(
    spanName,
    {
      attributes,
      operation: 'TRANSACTION',
    },
    fn,
  );
}
