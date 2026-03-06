import { getState } from '../state';
import { HELP_CONTENT, renderHelpOverlay } from '../help';

export function HelpMarker({ helpKey }: { helpKey: string }) {
  const showHelp = getState().showHelp;
  const content = HELP_CONTENT[helpKey];

  if (!showHelp || !content) return null;

  return (
    <button
      type="button"
      class="help-marker"
      aria-label={`Help for ${content.title}`}
      onClick={(e) => {
        e.stopPropagation();
        renderHelpOverlay(helpKey);
      }}
    >
      ?
    </button>
  );
}
