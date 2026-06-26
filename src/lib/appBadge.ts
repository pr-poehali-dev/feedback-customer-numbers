// Управление бейджем (числом) на иконке установленного приложения (PWA).
// Работает в установленном приложении на поддерживающих платформах
// (Android/Chrome, Windows, macOS; на iOS — в установленном PWA с iOS 16.4+).

interface BadgeNavigator extends Navigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

export const setAppBadge = (count: number): void => {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as BadgeNavigator;
  try {
    if (count > 0 && nav.setAppBadge) {
      nav.setAppBadge(count).catch(() => {});
    } else if (nav.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    }
  } catch {
    /* платформа не поддерживает бейдж */
  }
};

export const clearAppBadge = (): void => setAppBadge(0);
