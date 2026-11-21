export function renderProfileName(
  name: string | null,
  id: string | null,
  fallback: string,
  onOpenProfile: (userId: string) => void,
) {
  if (!name) return fallback;
  if (!id) return name;
  return (
    <button
      class="btn-text"
      style="color: var(--neon-blue); text-decoration: underline; cursor: pointer; padding: 0; background: none; border: none; font-family: inherit; font-size: inherit;"
      onClick={() => {
        onOpenProfile(id);
      }}
    >
      {name}
    </button>
  );
}
