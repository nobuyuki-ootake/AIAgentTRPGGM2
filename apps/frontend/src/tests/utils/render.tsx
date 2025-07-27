import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot, RecoilState, RecoilValue } from 'recoil';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { theme } from '@/components/theme/AppTheme';

// Custom render options interface
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Recoil initial state configuration
  recoilState?: Array<{
    recoilState: RecoilState<any>;
    initialValue: any;
  }>;
  // Router configuration
  initialRoute?: string;
  // Theme configuration
  customTheme?: typeof theme;
  // Provider configuration
  withRouter?: boolean;
  withRecoil?: boolean;
  withTheme?: boolean;
  withSnackbar?: boolean;
}

// Default provider configuration
const defaultProviderConfig = {
  withRouter: true,
  withRecoil: true,
  withTheme: true,
  withSnackbar: true,
};

/**
 * Custom render function with all necessary providers for TRPG components
 * Follows project guidelines: "使用するのは本番と同じ型"
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    recoilState = [],
    initialRoute = '/',
    customTheme = theme,
    withRouter = true,
    withRecoil = true,
    withTheme = true,
    withSnackbar = true,
    ...renderOptions
  } = { ...defaultProviderConfig, ...options };

  // RecoilRoot with initial state
  const RecoilWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (!withRecoil) return <>{children}</>;

    // Initialize Recoil state if provided
    const initializeState = ({ set }: any) => {
      recoilState.forEach(({ recoilState: atom, initialValue }) => {
        set(atom, initialValue);
      });
    };

    return (
      <RecoilRoot initializeState={initializeState}>
        {children}
      </RecoilRoot>
    );
  };

  // Router wrapper
  const RouterWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (!withRouter) return <>{children}</>;
    
    // Use memory router for tests to avoid browser dependencies
    const MemoryRouter = React.lazy(() => 
      import('react-router-dom').then(module => ({ 
        default: module.MemoryRouter 
      }))
    );

    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        <MemoryRouter initialEntries={[initialRoute]}>
          {children}
        </MemoryRouter>
      </React.Suspense>
    );
  };

  // Theme wrapper
  const ThemeWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (!withTheme) return <>{children}</>;

    return (
      <ThemeProvider theme={customTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    );
  };

  // Snackbar wrapper
  const SnackbarWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    if (!withSnackbar) return <>{children}</>;

    return (
      <SnackbarProvider 
        maxSnack={3}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        dense
        preventDuplicate
      >
        {children}
      </SnackbarProvider>
    );
  };

  // Combined wrapper
  const AllTheProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
      <RecoilWrapper>
        <RouterWrapper>
          <ThemeWrapper>
            <SnackbarWrapper>
              {children}
            </SnackbarWrapper>
          </ThemeWrapper>
        </RouterWrapper>
      </RecoilWrapper>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

/**
 * Lightweight render for components that don't need all providers
 */
export function renderWithMinimalProviders(
  ui: ReactElement,
  options: Omit<CustomRenderOptions, 'withRouter' | 'withRecoil' | 'withTheme' | 'withSnackbar'> = {}
): RenderResult {
  return renderWithProviders(ui, {
    ...options,
    withRouter: false,
    withRecoil: false,
    withSnackbar: false,
  });
}

/**
 * Render with only Recoil for state management tests
 */
export function renderWithRecoil(
  ui: ReactElement,
  options: Pick<CustomRenderOptions, 'recoilState'> = {}
): RenderResult {
  return renderWithProviders(ui, {
    ...options,
    withRouter: false,
    withTheme: false,
    withSnackbar: false,
  });
}

/**
 * Render with only router for navigation tests
 */
export function renderWithRouter(
  ui: ReactElement,
  options: Pick<CustomRenderOptions, 'initialRoute'> = {}
): RenderResult {
  return renderWithProviders(ui, {
    ...options,
    withRecoil: false,
    withTheme: false,
    withSnackbar: false,
  });
}

/**
 * Render with only theme for styling tests
 */
export function renderWithTheme(
  ui: ReactElement,
  options: Pick<CustomRenderOptions, 'customTheme'> = {}
): RenderResult {
  return renderWithProviders(ui, {
    ...options,
    withRouter: false,
    withRecoil: false,
    withSnackbar: false,
  });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';