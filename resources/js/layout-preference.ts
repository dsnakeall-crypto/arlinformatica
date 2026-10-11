/**
 * Device preference is explicit once saved. Resizing a desktop window must
 * never overwrite the layout, even when its width becomes phone-sized.
 * Actual phones/tablets stay in the mobile UI (the Web option is unavailable).
 */
export type LayoutMode = 'desktop' | 'mobile';

export function isHandheldDevice(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(userAgent);
}

export function resolveLayoutMode(saved: string | null, userAgent: string, narrowViewport: boolean): LayoutMode {
  if (isHandheldDevice(userAgent)) return 'mobile';
  if (saved === 'desktop' || saved === 'mobile') return saved;
  return narrowViewport ? 'mobile' : 'desktop';
}

export const layoutStorageKey = 'arl-layout-mode';
