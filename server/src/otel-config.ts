interface OtelEnvironment {
  CI?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_SDK_DISABLED?: string;
}

/**
 * Keep SDK startup and health reporting on one definition of "disabled".
 */
export function isOtelSdkDisabled(environment: OtelEnvironment = process.env): boolean {
  return (
    environment.OTEL_SDK_DISABLED === 'true' ||
    (environment.CI === 'true' && !environment.OTEL_EXPORTER_OTLP_ENDPOINT)
  );
}
