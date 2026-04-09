import {
  context,
  metrics,
  propagation,
  trace,
  SpanStatusCode,
  type Attributes,
  type Span,
} from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import type { ClientMessage } from '../../shared/src/index.ts';

type AttrValue = string | number | boolean;

export interface QaRunMeta {
  tool: string;
  runId: string;
  baseUrl?: string;
  seed?: number;
  damageMode?: string;
  startingLifepoints?: number;
  p1?: string;
  p2?: string;
  headed?: boolean;
  scenarioPath?: string;
}

export interface QaRunResult {
  status: 'success' | 'failure';
  durationMs: number;
  turnCount?: number;
  actionCount?: number;
  reconnectCount?: number;
  failureReason?: string;
  failureMessage?: string;
  outcomeText?: string | null;
}

const tracer = trace.getTracer('phx-qa');
const meter = metrics.getMeter('phx-qa');
const logger = logs.getLogger('phx-qa', '1.0.0');

const runCounter = meter.createCounter('qa.run.total', {
  description: 'Total QA runs by tool and outcome.',
});
const runDurationMs = meter.createHistogram('qa.run.duration_ms', {
  description: 'Duration of QA runs.',
  unit: 'ms',
});
const turnCountHistogram = meter.createHistogram('qa.run.turn_count', {
  description: 'Turn counts observed in QA runs.',
  unit: 'turn',
});
const actionCountHistogram = meter.createHistogram('qa.run.action_count', {
  description: 'Action counts observed in QA runs.',
  unit: 'action',
});
const reconnectCounter = meter.createCounter('qa.reconnect.total', {
  description: 'Reconnect indicators observed during QA runs.',
});
const patternCounter = meter.createCounter('qa.pattern.total', {
  description: 'QA-detected patterns and anomalies.',
});

function compactAttrs(values: Record<string, AttrValue | undefined>): Attributes {
  const attrs: Attributes = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      attrs[key] = value;
    }
  }
  return attrs;
}

function emitLog(
  span: Span,
  severityNumber: SeverityNumber,
  severityText: string,
  body: string,
  attributes: Attributes,
): void {
  logger.emit({
    severityNumber,
    severityText,
    body,
    attributes,
    context: trace.setSpan(context.active(), span),
  });
}

export class QaRun {
  readonly runId: string;
  readonly tool: string;
  private readonly span: Span;
  private readonly baseAttrs: Attributes;

  constructor(meta: QaRunMeta) {
    this.runId = meta.runId;
    this.tool = meta.tool;
    this.baseAttrs = compactAttrs({
      'qa.run_id': meta.runId,
      'qa.tool': meta.tool,
      'qa.base_url': meta.baseUrl,
      'qa.seed': meta.seed,
      'game.damage_mode': meta.damageMode,
      'game.starting_lp': meta.startingLifepoints,
      'qa.p1': meta.p1,
      'qa.p2': meta.p2,
      'qa.headed': meta.headed,
      'qa.scenario_path': meta.scenarioPath,
    });
    this.span = tracer.startSpan(`qa.${meta.tool}.run`, {
      attributes: this.baseAttrs,
    });
    emitLog(this.span, SeverityNumber.INFO, 'INFO', `qa.run.start ${meta.tool}`, this.baseAttrs);
  }

  bindMatch(matchId: string, attrs: Record<string, AttrValue | undefined> = {}): void {
    const nextAttrs = compactAttrs({
      'match.id': matchId,
      ...attrs,
    });
    this.span.setAttributes(nextAttrs);
    this.span.addEvent('qa.match.bound', nextAttrs);
  }

  annotate(eventName: string, attrs: Record<string, AttrValue | undefined> = {}): void {
    this.span.addEvent(
      eventName,
      compactAttrs({
        'qa.run_id': this.runId,
        'qa.tool': this.tool,
        ...attrs,
      }),
    );
  }

  wrapClientMessage<T extends ClientMessage>(message: T): T {
    const carrier: Record<string, string> = {};
    propagation.inject(trace.setSpan(context.active(), this.span), carrier);

    return {
      ...message,
      telemetry: {
        ...message.telemetry,
        ...carrier,
        qaRunId: this.runId,
        originService: `phx-qa-${this.tool}`,
      },
    };
  }

  recordReconnect(
    actor: string,
    reason: string,
    attrs: Record<string, AttrValue | undefined> = {},
  ): void {
    const reconnectAttrs = compactAttrs({
      ...this.baseAttrs,
      'qa.actor': actor,
      'qa.reconnect_reason': reason,
      ...attrs,
    });
    reconnectCounter.add(1, reconnectAttrs);
    this.span.addEvent('qa.reconnect', reconnectAttrs);
    emitLog(
      this.span,
      SeverityNumber.WARN,
      'WARN',
      `qa.reconnect ${actor} ${reason}`,
      reconnectAttrs,
    );
  }

  recordPattern(
    pattern: string,
    attrs: Record<string, AttrValue | undefined> = {},
    severityNumber: SeverityNumber = SeverityNumber.INFO,
    severityText = 'INFO',
  ): void {
    const patternAttrs = compactAttrs({
      ...this.baseAttrs,
      'qa.pattern': pattern,
      ...attrs,
    });
    patternCounter.add(1, patternAttrs);
    this.span.addEvent(`qa.pattern.${pattern}`, patternAttrs);
    emitLog(this.span, severityNumber, severityText, `qa.pattern ${pattern}`, patternAttrs);
  }

  finish(result: QaRunResult): void {
    const resultAttrs = compactAttrs({
      ...this.baseAttrs,
      'qa.status': result.status,
      'qa.failure_reason': result.failureReason,
      'qa.reconnect_count': result.reconnectCount,
      'qa.turn_count': result.turnCount,
      'qa.action_count': result.actionCount,
    });

    runCounter.add(1, resultAttrs);
    runDurationMs.record(result.durationMs, resultAttrs);
    if (result.turnCount !== undefined) {
      turnCountHistogram.record(result.turnCount, resultAttrs);
    }
    if (result.actionCount !== undefined) {
      actionCountHistogram.record(result.actionCount, resultAttrs);
    }

    if (result.status === 'failure') {
      this.span.setStatus({
        code: SpanStatusCode.ERROR,
        message: result.failureMessage ?? result.failureReason ?? 'qa run failed',
      });
      emitLog(
        this.span,
        SeverityNumber.ERROR,
        'ERROR',
        `qa.run.failure ${this.tool}`,
        compactAttrs({
          ...resultAttrs,
          'qa.failure_message': result.failureMessage,
        }),
      );
    } else {
      this.span.setStatus({ code: SpanStatusCode.OK });
      emitLog(
        this.span,
        SeverityNumber.INFO,
        'INFO',
        `qa.run.success ${this.tool}`,
        compactAttrs({
          ...resultAttrs,
          'qa.outcome_text': result.outcomeText ?? undefined,
        }),
      );
    }

    this.span.addEvent('qa.run.finish', resultAttrs);
    this.span.end();
  }
}

export function beginQaRun(meta: QaRunMeta): QaRun {
  return new QaRun(meta);
}
