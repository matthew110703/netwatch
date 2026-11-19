const NAV_STACK_KEY = 'netwatch_nav_stack';
const MAX_STACK_SIZE = 25;

function isWatchRoute(path: string): boolean {
  return path === '/watch' || path.startsWith('/watch/') || path.startsWith('/watch?');
}

function readStack(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(NAV_STACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string' && !isWatchRoute(entry))
      : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK_SIZE)));
  } catch {
    // Ignore storage restriction errors in private browsing modes
  }
}

export function recordNonWatchRoute(fullPath: string): void {
  if (!fullPath || isWatchRoute(fullPath)) return;
  const stack = readStack();
  if (stack[stack.length - 1] === fullPath) return;
  stack.push(fullPath);
  writeStack(stack);
}

export function popBackDestination(currentPath: string, fallbackPath: string): string {
  const stack = readStack();
  const baseCurrent = currentPath.split('?')[0];

  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top === currentPath || top.split('?')[0] === baseCurrent || isWatchRoute(top)) {
      stack.pop();
    } else {
      break;
    }
  }

  writeStack(stack);
  return stack[stack.length - 1] || fallbackPath;
}
