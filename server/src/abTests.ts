export interface AbTestVariant {
  name: string;
  ratio: number;
}

export interface AbTest {
  id: string;
  description: string | null;
  variants: AbTestVariant[];
  totalRatio: number;
}

export interface AbTestsSnapshot {
  tests: AbTest[];
  warnings: string[];
}

interface RawAbTest {
  id?: unknown;
  description?: unknown;
  variants?: unknown;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function parseVariantMap(input: unknown): AbTestVariant[] | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }

  const entries = Object.entries(input);
  if (entries.length === 0) return null;

  const variants: AbTestVariant[] = [];
  for (const [name, ratioRaw] of entries) {
    const ratio = toFiniteNumber(ratioRaw);
    if (!name || ratio === null || ratio < 0) return null;
    variants.push({ name, ratio });
  }

  return variants;
}

function parseVariantsArray(input: unknown): AbTestVariant[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;

  const variants: AbTestVariant[] = [];
  for (const item of input) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;

    const record = item as Record<string, unknown>;
    const name = record.name;
    const ratioRaw = record.ratio;
    const ratio = toFiniteNumber(ratioRaw);
    if (typeof name !== 'string' || !name || ratio === null || ratio < 0) return null;
    variants.push({ name, ratio });
  }

  return variants;
}

function parseRawTest(
  raw: RawAbTest,
  index: number,
): { test: AbTest | null; warning: string | null } {
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return { test: null, warning: `Entry #${index + 1}: missing non-empty id` };
  }

  const variants = parseVariantsArray(raw.variants) ?? parseVariantMap(raw.variants);
  if (!variants) {
    return {
      test: null,
      warning: `Entry "${raw.id}": variants must be a non-empty array or object of ratios`,
    };
  }

  const description = typeof raw.description === 'string' ? raw.description : null;
  const totalRatio = variants.reduce((sum, v) => sum + v.ratio, 0);

  return {
    test: {
      id: raw.id,
      description,
      variants,
      totalRatio,
    },
    warning:
      totalRatio === 100 ? null : `Entry "${raw.id}": ratio total is ${totalRatio} (expected 100)`,
  };
}

export function getAbTestsSnapshotFromEnv(): AbTestsSnapshot {
  const raw = process.env.PHALANX_AB_TESTS_JSON;
  if (!raw) {
    return { tests: [], warnings: [] };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        tests: [],
        warnings: ['PHALANX_AB_TESTS_JSON must be a JSON array of experiment definitions'],
      };
    }

    const tests: AbTest[] = [];
    const warnings: string[] = [];
    const seenTestIds = new Set<string>();

    for (let i = 0; i < parsed.length; i += 1) {
      const entry = parsed[i];
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        warnings.push(`Entry #${i + 1}: expected object`);
        continue;
      }

      const { test, warning } = parseRawTest(entry as RawAbTest, i);
      if (test) {
        if (seenTestIds.has(test.id)) {
          warnings.push(`Entry "${test.id}": duplicate id ignored`);
        } else {
          seenTestIds.add(test.id);
          tests.push(test);
        }
      }
      if (warning) warnings.push(warning);
    }

    return { tests, warnings };
  } catch {
    return {
      tests: [],
      warnings: ['PHALANX_AB_TESTS_JSON is not valid JSON'],
    };
  }
}
