/**
 * Hash-based routing utilities for TimberGem.
 * Supports two routes:
 * - #p={projectId} - Main project view (existing)
 * - #scope={scopeId} - Scope editor view (new)
 */

export type Route =
  | { type: 'project'; projectId: string }
  | { type: 'scope'; scopeId: string; projectId: string }
  | { type: 'home' };

/**
 * Parse the current hash into a route object.
 */
export function parseRoute(): Route {
  if (typeof window === 'undefined') return { type: 'home' };
  
  const hash = window.location.hash;
  
  // Match #scope={scopeId}&p={projectId}
  const scopeMatch = hash.match(/#scope=([a-f0-9]+)(?:&p=([a-f0-9]+))?/i);
  if (scopeMatch) {
    const scopeId = scopeMatch[1];
    const projectId = scopeMatch[2] || extractProjectIdFromContext();
    return { type: 'scope', scopeId, projectId };
  }
  
  // Match #p={projectId}
  const projectMatch = hash.match(/#p=([a-f0-9]+)/i);
  if (projectMatch) {
    return { type: 'project', projectId: projectMatch[1] };
  }
  
  return { type: 'home' };
}

/**
 * Extract project ID from localStorage or current context.
 */
function extractProjectIdFromContext(): string {
  try {
    const lastProjectId = localStorage.getItem('lastProjectId');
    if (lastProjectId) return lastProjectId;
  } catch {}
  return '';
}

/**
 * Navigate to scope editor.
 */
export function navigateToScope(scopeId: string, projectId?: string): void {
  if (typeof window === 'undefined') return;
  
  const pid = projectId || extractProjectIdFromContext();
  if (pid) {
    window.location.hash = `#scope=${scopeId}&p=${pid}`;
  } else {
    window.location.hash = `#scope=${scopeId}`;
  }
}

/**
 * Navigate to main project view.
 */
export function navigateToProject(projectId?: string): void {
  if (typeof window === 'undefined') return;
  
  const pid = projectId || extractProjectIdFromContext();
  if (pid) {
    window.location.hash = `#p=${pid}`;
  } else {
    window.location.hash = '';
  }
}

/**
 * Navigate to home (upload screen).
 */
export function navigateToHome(): void {
  if (typeof window === 'undefined') return;
  window.location.hash = '';
}

/**
 * Hook to listen for route changes.
 */
export function onRouteChange(callback: (route: Route) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handler = () => callback(parseRoute());
  window.addEventListener('hashchange', handler);
  
  return () => window.removeEventListener('hashchange', handler);
}

