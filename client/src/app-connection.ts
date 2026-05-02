import type { Connection } from './connection';

let _connection: Connection | null = null;

export function setConnection(conn: Connection): void {
  _connection = conn;
}

export function getConnection(): Connection | null {
  return _connection;
}
