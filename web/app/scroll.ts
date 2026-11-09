/** Back to the top of the screen. On phones the screen area scrolls (not the page), so reset both. */
export function scrollToTop() {
  window.scrollTo({ top: 0 });
  document.querySelector('.app-shell')?.scrollTo({ top: 0 });
}
