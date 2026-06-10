export function setupLandscapeOrientation() {
  const root = document.documentElement;
  const overlay = document.getElementById('rotate-device');

  const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const isPortrait = () => window.matchMedia('(orientation: portrait)').matches;

  const updateOverlay = () => {
    const shouldShow = isTouchDevice() && isPortrait();
    root.classList.toggle('is-portrait', shouldShow);
    if (overlay) {
      overlay.hidden = !shouldShow;
    }
  };

  const requestLandscape = async () => {
    if (!isTouchDevice()) return;

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_error) {
      // Browsers may reject fullscreen outside trusted gestures.
    }

    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch (_error) {
      // Orientation lock is best-effort on mobile browsers.
    }

    updateOverlay();
  };

  window.addEventListener('orientationchange', updateOverlay);
  window.addEventListener('resize', updateOverlay);
  document.addEventListener('pointerdown', requestLandscape, { once: true });
  document.addEventListener('touchstart', requestLandscape, { once: true, passive: true });

  updateOverlay();
}
