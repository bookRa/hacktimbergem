import type { EntityFlags, EntityType } from '../api/entities';

const trimString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export function deriveEntityFlags(
  entityType: EntityType, 
  attrs: Record<string, any>,
  links?: Array<{ rel_type: string; source_id: string; target_id: string }> | null
): EntityFlags {
  const missing: Record<'drawing' | 'definition' | 'scope', boolean> = {
    drawing: false,
    definition: false,
    scope: false,
  };

  switch (entityType) {
    case 'drawing':
    case 'legend':
    case 'schedule': {
      missing.drawing = trimString(attrs.title).length === 0;
      break;
    }
    case 'note': {
      missing.drawing = trimString(attrs.text).length === 0;
      break;
    }
    case 'scope': {
      const hasName = trimString(attrs.name).length > 0;
      const hasDescription = trimString(attrs.description).length > 0;
      missing.scope = !(hasName && hasDescription);
      break;
    }
    case 'symbol_definition':
    case 'component_definition': {
      missing.definition = trimString(attrs.name).length === 0;
      break;
    }
    case 'symbol_instance': {
      missing.definition = !attrs.symbol_definition_id;
      // Check for JUSTIFIED_BY link (scope -> instance) OR direct scope_id field
      const hasDirectScope = attrs.scope_id || attrs.scope;
      const hasScopeLink = links?.some(
        (link) => link.rel_type === 'JUSTIFIED_BY' && link.target_id === attrs.id
      );
      missing.scope = !hasDirectScope && !hasScopeLink;
      break;
    }
    case 'component_instance': {
      missing.definition = !attrs.component_definition_id;
      // Check for JUSTIFIED_BY link (scope -> instance) OR direct scope_id field
      const hasDirectScope = attrs.scope_id || attrs.scope;
      const hasScopeLink = links?.some(
        (link) => link.rel_type === 'JUSTIFIED_BY' && link.target_id === attrs.id
      );
      missing.scope = !hasDirectScope && !hasScopeLink;
      break;
    }
    default:
      break;
  }

  type MissingFlags = NonNullable<NonNullable<EntityFlags['validation']>['missing']>;
  const activeMissing: MissingFlags = {};
  for (const [key, value] of Object.entries(missing)) {
    if (!value) continue;
    activeMissing[key as keyof typeof missing] = true;
  }

  if (!Object.keys(activeMissing).length) {
    return { status: 'complete', validation: {} };
  }

  return {
    status: 'incomplete',
    validation: { missing: activeMissing },
  };
}
