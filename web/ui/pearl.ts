/** Makes the Current Priority glass light match the priority icon. Reads the icon's RENDERED color (the single source of
 *  truth) and hands it to the card as --exe-priority-accent. It changes nothing about the icon. Call it right after the card
 *  is rendered and whenever the active priority changes; there is no observer or polling. */
export function syncPriorityGlassAccent(root: ParentNode = document): void {
  const card = root.querySelector<HTMLElement>('.priority-hero');
  const icon = card?.querySelector<HTMLElement>('.hero-icon');
  if (!card || !icon) return;
  const svg = icon.querySelector('svg');
  // Computed styles resolve even while the icon is hidden (the compact layout hides it), so the color is still the icon's.
  let accent = svg ? getComputedStyle(svg).stroke : '';
  if (!accent || accent === 'none' || accent === 'currentColor') accent = (svg ? getComputedStyle(svg).color : '') || getComputedStyle(icon).color;
  if (accent) card.style.setProperty('--exe-priority-accent', accent);
}
