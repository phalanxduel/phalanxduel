import { useMemo, useState } from 'preact/hooks';
import type { CalculationProvenance } from '@phalanxduel/shared';
import {
  buildCombatExplanation,
  explanationLinesForMode,
  type CombatExplanationMode,
} from '../combat-explanation';

interface CombatMathProps {
  provenance: CalculationProvenance | undefined;
  context: 'live' | 'preview' | 'replay' | 'postmatch' | 'log';
  defaultMode?: CombatExplanationMode;
  interactive?: boolean;
  label?: string;
}

const MODE_LABELS: Record<CombatExplanationMode, string> = {
  tactical: 'TACTICAL',
  cinematic: 'CINEMATIC',
  analyst: 'ANALYST',
};

export function CombatMath({
  provenance,
  context,
  defaultMode = 'tactical',
  interactive = true,
  label = 'COMBAT MATH',
}: CombatMathProps) {
  const [mode, setMode] = useState<CombatExplanationMode>(defaultMode);
  const explanation = useMemo(() => buildCombatExplanation(provenance), [provenance]);
  if (!explanation) return null;

  const lines = explanationLinesForMode(explanation, mode);

  return (
    <section
      class={`combat-math combat-math-${context} combat-math-${mode}`}
      data-component="CombatExplanationView"
      data-context={context}
      data-mode={mode}
      data-source-step-count={explanation.sourceStepCount}
      data-visible-sequences={lines.map((line) => line.sequence).join(',')}
      data-testid={`combat-math-${context}`}
    >
      <div class="combat-math-header">
        <span class="combat-math-kicker">{label}</span>
        {interactive && (
          <div class="combat-math-modes" role="group" aria-label="Combat explanation detail">
            {(Object.keys(MODE_LABELS) as CombatExplanationMode[]).map((candidate) => (
              <button
                type="button"
                key={candidate}
                class={candidate === mode ? 'is-active' : ''}
                aria-pressed={candidate === mode}
                onClick={(event) => {
                  event.stopPropagation();
                  setMode(candidate);
                }}
              >
                {MODE_LABELS[candidate]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div class="combat-math-equations" aria-hidden="true">
        {lines.map((line) => (
          <div class="combat-math-equation" key={line.sequence} data-rule-id={line.ruleId}>
            <span>{line.expression}</span>
            {mode === 'analyst' && <small>{line.ruleId}</small>}
          </div>
        ))}
      </div>
      <span class="sr-only">{lines.map((line) => line.spoken).join(' ')}</span>
    </section>
  );
}
