// Hooks exports
export { useApi } from './useApi';

// Permission hooks
export {
  usePermission,
  useAnyPermission,
  useAllPermissions,
  useCanAccessRoute,
  useCanPerformAction,
  useUserPermissions,
  useCanAssignRole,
  useAssignableRoles,
  usePermissions
} from './usePermissions';

// Business rules hooks
export {
  useActivityCompletionValidation,
  useAssignmentOverlapValidation,
  useRoleBasedValidation,
  useProjectAssignmentValidation,
  useTimeEntryValidation,
  useMaterialStockValidation,
  useChecklistCompletionValidation,
  useActivityStateChangeValidation,
  useBusinessRules
} from './useBusinessRules';

// Responsive hooks
export {
  useResponsive,
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsTouchDevice,
  usePrefersReducedMotion
} from './useResponsive';

// Accessibility hooks
export {
  useFocusTrap,
  useKeyboardNavigation,
  useScreenReader,
  useSkipLinks,
  useAriaAttributes,
  useColorContrast,
  useReducedMotion
} from './useAccessibility';