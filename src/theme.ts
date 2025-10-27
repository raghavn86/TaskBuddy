import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create mobile-first theme
let theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.125rem', // Smaller for mobile
      fontWeight: 500,
    },
    h2: {
      fontSize: '1.75rem', // Smaller for mobile
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.5rem', // Smaller for mobile
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.25rem', // Smaller for mobile
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.1rem', // Smaller for mobile
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '8px 16px', // Better touch targets for mobile
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // Larger touch targets for mobile
          padding: 8,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48, // Taller tabs for mobile
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 10, // Better touch targets
          paddingBottom: 10,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

// Apply responsive typography for different screen sizes
theme = responsiveFontSizes(theme);

export default theme;