import React from 'react';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { useRecoilValue } from 'recoil';
import { themeAtom } from '@/store/atoms';

interface AppThemeProps {
  children: React.ReactNode;
}

export const AppTheme: React.FC<AppThemeProps> = ({ children }) => {
  const themeMode = useRecoilValue(themeAtom);

  const theme = React.useMemo(
    () => createTheme({
      palette: {
        mode: themeMode,
        primary: {
          main: themeMode === 'dark' ? '#90caf9' : '#1976d2',
        },
        secondary: {
          main: themeMode === 'dark' ? '#f48fb1' : '#dc004e',
        },
        background: {
          default: themeMode === 'dark' ? '#121212' : '#fafafa',
          paper: themeMode === 'dark' ? '#1e1e1e' : '#ffffff',
        },
        text: {
          primary: themeMode === 'dark' ? '#ffffff' : '#000000',
          secondary: themeMode === 'dark' ? '#aaaaaa' : '#666666',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
          fontSize: '2.5rem',
          fontWeight: 600,
        },
        h2: {
          fontSize: '2rem',
          fontWeight: 600,
        },
        h3: {
          fontSize: '1.75rem',
          fontWeight: 600,
        },
        h4: {
          fontSize: '1.5rem',
          fontWeight: 600,
        },
        h5: {
          fontSize: '1.25rem',
          fontWeight: 600,
        },
        h6: {
          fontSize: '1rem',
          fontWeight: 600,
        },
        body1: {
          fontSize: '1rem',
          lineHeight: 1.6,
        },
        body2: {
          fontSize: '0.875rem',
          lineHeight: 1.6,
        },
      },
      shape: {
        borderRadius: 8,
      },
      spacing: 8,
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: themeMode === 'dark' ? '#2b2b2b' : '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: themeMode === 'dark' ? '#6b6b6b' : '#c1c1c1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: themeMode === 'dark' ? '#8b8b8b' : '#a1a1a1',
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: themeMode === 'dark'
                ? '0 4px 12px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.1)',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              boxShadow: 'none',
              borderBottom: `1px solid ${themeMode === 'dark' ? '#333' : '#e0e0e0'}`,
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              borderRight: `1px solid ${themeMode === 'dark' ? '#333' : '#e0e0e0'}`,
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: 'outlined',
            size: 'small',
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 500,
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
    }),
    [themeMode]
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};