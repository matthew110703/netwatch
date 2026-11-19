export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
}

export function isPathActive(currentPath: string, targetHref: string): boolean {
  if (targetHref === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(targetHref);
}

export function getStatusBadgeClasses(isOnline: boolean): string {
  return isOnline
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30';
}
