/**
 * Unified Design System for TimberGem
 * 
 * All styling should follow these rules:
 * - NO dark background text boxes
 * - NEVER light text on light background
 * - High contrast for readability
 * - Clean, modern, professional appearance
 */

export const colors = {
  // Base colors
  white: '#ffffff',
  
  // Text colors (always dark on light backgrounds)
  textPrimary: '#0f172a',   // Very dark for maximum readability
  textSecondary: '#475569',  // Medium gray
  textTertiary: '#64748b',   // Lighter gray
  textMuted: '#94a3b8',      // Muted text
  
  // Background colors (always light)
  bgPrimary: '#ffffff',      // Pure white
  bgSecondary: '#f8fafc',    // Very light gray
  bgTertiary: '#f1f5f9',     // Light gray
  
  // Border colors
  borderLight: '#e2e8f0',
  borderMedium: '#cbd5e1',
  borderDark: '#94a3b8',
  
  // Brand colors
  primary: '#2563eb',        // Blue
  primaryLight: '#dbeafe',
  primaryDark: '#1e40af',
  
  // Status colors
  success: '#10b981',
  successLight: '#dcfce7',
  successDark: '#166534',
  
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  warningDark: '#92400e',
  
  danger: '#dc2626',
  dangerLight: '#fecaca',
  dangerDark: '#991b1b',
  
  info: '#0ea5e9',
  infoLight: '#e0f2fe',
  infoDark: '#075985',
};

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  
  // Font sizes
  xs: 10,
  sm: 11,
  base: 12,
  md: 13,
  lg: 14,
  xl: 16,
  
  // Font weights
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  xxxl: 24,
};

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 16,
  full: 9999,
};

// Reusable component styles
export const componentStyles = {
  label: {
    display: 'block' as const,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  
  input: {
    width: '100%',
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderMedium}`,
    color: colors.textPrimary,
    fontSize: typography.md,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: borderRadius.md,
    outline: 'none' as const,
    transition: 'border-color 0.15s ease',
    fontFamily: typography.fontFamily,
  },
  
  textarea: {
    width: '100%',
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderMedium}`,
    color: colors.textPrimary,
    fontSize: typography.md,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderRadius: borderRadius.md,
    resize: 'vertical' as const,
    outline: 'none' as const,
    fontFamily: typography.fontFamily,
    lineHeight: 1.5,
  },
  
  button: (disabled: boolean = false) => ({
    background: disabled ? colors.bgTertiary : colors.primary,
    color: disabled ? colors.textMuted : colors.white,
    border: 'none',
    fontSize: typography.base,
    fontWeight: typography.medium,
    padding: `${spacing.sm}px ${spacing.xl}px`,
    borderRadius: borderRadius.md,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.15s ease',
  }),
  
  buttonSecondary: {
    background: colors.bgTertiary,
    color: colors.textSecondary,
    border: `1px solid ${colors.borderMedium}`,
    fontSize: typography.base,
    fontWeight: typography.medium,
    padding: `${spacing.sm}px ${spacing.xl}px`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  
  buttonDanger: {
    background: colors.white,
    color: colors.danger,
    border: `1px solid ${colors.dangerLight}`,
    fontSize: typography.base,
    fontWeight: typography.medium,
    padding: `${spacing.sm}px ${spacing.xl}px`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  
  card: {
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  
  badge: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase' as const,
    background: colors.primaryLight,
    color: colors.primaryDark,
    padding: `3px ${spacing.md}px`,
    borderRadius: borderRadius.sm,
  },
  
  chip: {
    fontSize: typography.base,
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderLight}`,
    padding: `${spacing.sm}px ${spacing.lg}px`,
    borderRadius: borderRadius.pill,
    color: colors.textPrimary,
    fontWeight: typography.medium,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
};

// Helper to create hover states
export const hover = {
  button: {
    filter: 'brightness(1.1)',
  },
  card: {
    borderColor: colors.borderDark,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
};

