/**
 * renderWithProviders - テスト用レンダリングユーティリティ
 * 
 * RecoilRootやその他必要なプロバイダーをラップした
 * コンポーネントをレンダリングするためのヘルパー関数
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { RecoilRoot, MutableSnapshot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Recoilの初期状態を設定するための型
type InitializeState = (mutableSnapshot: MutableSnapshot) => void;

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initializeState?: InitializeState;
  route?: string;
}

/**
 * 全てのプロバイダーをラップするコンポーネント
 */
function AllTheProviders({ 
  children, 
  initializeState 
}: { 
  children: ReactNode;
  initializeState?: InitializeState;
}) {
  const theme = createTheme({
    palette: {
      mode: 'light',
    },
  });

  return (
    <RecoilRoot initializeState={initializeState}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </RecoilRoot>
  );
}

/**
 * カスタムレンダー関数
 * 
 * @param ui - レンダリングするReactコンポーネント
 * @param options - レンダリングオプション
 * @returns レンダリング結果とユーティリティ関数
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initializeState, route = '/', ...renderOptions } = options || {};

  // ルートを設定
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllTheProviders initializeState={initializeState}>
      {children}
    </AllTheProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Recoilの状態を初期化するヘルパー関数
 * 
 * @example
 * ```tsx
 * const initializeState = createInitializeState({
 *   currentCampaignAtom: mockCampaign,
 *   charactersAtom: [mockCharacter1, mockCharacter2],
 * });
 * 
 * renderWithProviders(<Component />, { initializeState });
 * ```
 */
export function createInitializeState(
  atoms: Record<string, any>
): InitializeState {
  return ({ set }) => {
    Object.entries(atoms).forEach(([atomKey, value]) => {
      // Dynamically import atoms to set their values
      import('../../store/atoms').then((atomsModule) => {
        const atom = (atomsModule as any)[atomKey];
        if (atom) {
          set(atom, value);
        }
      });
    });
  };
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';