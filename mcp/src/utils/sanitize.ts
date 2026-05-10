// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp('[\\x00-\\x1f\\x7f]', 'g');
const MAX_NAME_LENGTH = 64;

export function sanitizePlayerName(name: string | null | undefined): string {
  if (name == null || name.length === 0) return 'unknown';
  return name.replace(CONTROL_CHARS, ' ').trim().slice(0, MAX_NAME_LENGTH);
}
