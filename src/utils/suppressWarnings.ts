// Utility to suppress specific React warnings in development mode

/**
 * Suppresses specific React warnings by overriding console.error
 * This is useful for warnings from third-party libraries that can't be fixed directly
 */
export const suppressReactWarnings = () => {
  const originalConsoleError = console.error;
  
  // Override console.error to filter specific warnings
  console.error = (...args) => {
    // Filter out the react-beautiful-dnd defaultProps warning
    if (args[0] && typeof args[0] === 'string' && 
        args[0].includes('defaultProps will be removed from memo components')) {
      return;
    }
    
    // Pass through all other console errors normally
    originalConsoleError.apply(console, args);
  };
};