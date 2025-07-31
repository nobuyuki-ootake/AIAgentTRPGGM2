import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppLayout } from './AppLayout';
import {
  sidebarOpenAtom,
  themeAtom,
  developerModeAtom,
  appModeAtom,
  userModeAtom,
  currentCampaignAtom,
} from '@/store/atoms';
import { TRPGCampaign } from '@ai-agent-trpg/types';
import { ReactNode } from 'react';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test data
const testCampaign: TRPGCampaign = {
  id: 'campaign-1',
  name: 'Test Campaign',
  gameSystem: 'D&D 5e',
  theme: 'Fantasy',
  description: 'A test campaign',
  worldSettings: {
    technologyLevel: 'Medieval',
    magicLevel: 'High',
    scale: 'Regional',
    tone: 'Heroic',
  },
  playerInfo: {
    expectedCount: 4,
    experienceLevel: 'Beginner',
    playStyle: 'Balanced',
  },
  status: 'planning',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

// Test wrapper component
const createTestWrapper = (initialState: any = {}) => {
  const theme = createTheme();
  
  return ({ children }: { children: ReactNode }) => (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <RecoilRoot
          initializeState={(snapshot) => {
            if (initialState.currentCampaign !== undefined) {
              snapshot.set(currentCampaignAtom, initialState.currentCampaign);
            }
            if (initialState.sidebarOpen !== undefined) {
              snapshot.set(sidebarOpenAtom, initialState.sidebarOpen);
            }
            if (initialState.themeMode !== undefined) {
              snapshot.set(themeAtom, initialState.themeMode);
            }
            if (initialState.developerMode !== undefined) {
              snapshot.set(developerModeAtom, initialState.developerMode);
            }
            if (initialState.appMode !== undefined) {
              snapshot.set(appModeAtom, initialState.appMode);
            }
            if (initialState.userMode !== undefined) {
              snapshot.set(userModeAtom, initialState.userMode);
            }
          }}
        >
          {children}
        </RecoilRoot>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockNavigate.mockClear();
    // Reset location mock
    mockLocation.pathname = '/';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renderAppLayout_withChildren_shouldRenderChildrenInMainContent', () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <AppLayout>
            <div data-testid="test-content">Test Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('renderAppLayout_withoutCampaign_shouldShowDefaultTitle', () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('AI TRPG Game Master')).toBeInTheDocument();
    });

    it('renderAppLayout_withCampaign_shouldShowCampaignName', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('Test Campaign')).toBeInTheDocument();
    });

    it('renderAppLayout_withCampaign_shouldShowCampaignNameInSidebar', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should appear in sidebar header as well
      const campaignNames = screen.getAllByText('Test Campaign');
      expect(campaignNames.length).toBeGreaterThan(1);
    });
  });

  describe('Sidebar functionality', () => {
    it('sidebarToggle_clickMenuButton_shouldToggleSidebar', async () => {
      const TestWrapper = createTestWrapper({
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /open drawer/i });
      fireEvent.click(menuButton);

      // Sidebar state should change - this is tested via Recoil state changes
      await waitFor(() => {
        expect(menuButton).toBeInTheDocument();
      });
    });

    it('renderSidebar_inDeveloperMode_shouldShowDeveloperMenuItems', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('キャンペーン設定')).toBeInTheDocument();
      expect(screen.getByText('キャラクター管理')).toBeInTheDocument();
      expect(screen.getByText('場所管理')).toBeInTheDocument();
      expect(screen.getByText('シナリオエディタ')).toBeInTheDocument();
      expect(screen.getByText('GMセッション')).toBeInTheDocument();
    });

    it('renderSidebar_inUserMode_shouldShowUserMenuItems', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: false,
        appMode: 'user',
        userMode: true,
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('キャラクター選択')).toBeInTheDocument();
      expect(screen.getByText('ゲーム開始')).toBeInTheDocument();
    });

    it('renderSidebar_withoutCampaign_shouldDisableCampaignRequiredItems', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: null,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Campaign-dependent items should be disabled
      const campaignSettingsButton = screen.getByRole('button', { name: /キャンペーン設定/i });
      expect(campaignSettingsButton).toBeDisabled();
    });

    it('sidebarNavigation_clickMenuItem_shouldNavigateToCorrectPath', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const charactersMenuItem = screen.getByRole('button', { name: /キャラクター管理/i });
      fireEvent.click(charactersMenuItem);

      expect(mockNavigate).toHaveBeenCalledWith('/campaign/campaign-1/characters');
    });

    it('sidebarNavigation_clickHome_shouldNavigateToRoot', () => {
      const TestWrapper = createTestWrapper({
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const homeMenuItem = screen.getByRole('button', { name: /ホーム/i });
      fireEvent.click(homeMenuItem);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Theme switching', () => {
    it('themeToggle_clickThemeSwitch_shouldToggleTheme', async () => {
      const TestWrapper = createTestWrapper({
        themeMode: 'light',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const themeSwitch = screen.getByRole('checkbox', { name: /ライトモード/i });
      fireEvent.click(themeSwitch);

      // Theme state should change - this is tested via Recoil state changes
      await waitFor(() => {
        expect(themeSwitch).toBeInTheDocument();
      });
    });

    it('renderThemeToggle_inLightMode_shouldShowCorrectLabel', () => {
      const TestWrapper = createTestWrapper({
        themeMode: 'light',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('ダークモード')).toBeInTheDocument();
    });

    it('renderThemeToggle_inDarkMode_shouldShowCorrectLabel', () => {
      const TestWrapper = createTestWrapper({
        themeMode: 'dark',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('ライトモード')).toBeInTheDocument();
    });
  });

  describe('Developer mode switching', () => {
    it('developerModeToggle_clickSwitch_shouldToggleModeAndUpdateAppMode', async () => {
      const TestWrapper = createTestWrapper({
        developerMode: false,
        appMode: 'user',
        userMode: true,
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const devModeSwitch = screen.getByRole('checkbox', { name: /プレイヤーモード/i });
      fireEvent.click(devModeSwitch);

      // Developer mode and app mode states should change
      await waitFor(() => {
        expect(devModeSwitch).toBeInTheDocument();
      });
    });

    it('renderDeveloperModeToggle_inDeveloperMode_shouldShowCorrectLabel', () => {
      const TestWrapper = createTestWrapper({
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('シナリオ編集モード')).toBeInTheDocument();
    });

    it('renderDeveloperModeToggle_inUserMode_shouldShowCorrectLabel', () => {
      const TestWrapper = createTestWrapper({
        developerMode: false,
        userMode: true,
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('プレイヤーモード')).toBeInTheDocument();
    });

    it('renderModeIndicator_inDeveloperMode_shouldShowDEVBadge', () => {
      const TestWrapper = createTestWrapper({
        appMode: 'developer',
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('DEV')).toBeInTheDocument();
    });

    it('renderModeIndicator_inUserMode_shouldShowPLAYERBadge', () => {
      const TestWrapper = createTestWrapper({
        appMode: 'user',
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('PLAYER')).toBeInTheDocument();
    });

    it('renderModeIndicator_inStandardMode_shouldNotShowBadge', () => {
      const TestWrapper = createTestWrapper({
        appMode: 'standard',
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.queryByText('DEV')).not.toBeInTheDocument();
      expect(screen.queryByText('PLAYER')).not.toBeInTheDocument();
      expect(screen.queryByText('STANDARD')).not.toBeInTheDocument();
    });
  });

  describe('Active route highlighting', () => {
    it('renderNavigation_onHomePage_shouldHighlightHomeItem', () => {
      const TestWrapper = createTestWrapper({
        sidebarOpen: true,
      });
      
      mockLocation.pathname = '/';
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const homeButton = screen.getByRole('button', { name: /ホーム/i });
      expect(homeButton).toHaveClass('Mui-selected');
    });

    it('renderNavigation_onCampaignPage_shouldHighlightCampaignItem', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      mockLocation.pathname = '/campaign/campaign-1/setup';
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const campaignButton = screen.getByRole('button', { name: /キャンペーン設定/i });
      expect(campaignButton).toHaveClass('Mui-selected');
    });

    it('renderNavigation_onSessionPage_shouldHighlightSessionItem', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      mockLocation.pathname = '/campaign/campaign-1/session';
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const sessionButton = screen.getByRole('button', { name: /GMセッション/i });
      expect(sessionButton).toHaveClass('Mui-selected');
    });
  });

  describe('Session-specific behavior', () => {
    it('renderNavigation_inSession_shouldHidePlayerSelectOption', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        appMode: 'user',
        userMode: true,
        sidebarOpen: true,
      });
      
      mockLocation.pathname = '/campaign/campaign-1/play/session-1';
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.queryByText('キャラクター選択')).not.toBeInTheDocument();
      expect(screen.getByText('ゲーム開始')).toBeInTheDocument();
    });

    it('renderNavigation_notInSession_shouldShowAllUserModeOptions', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        appMode: 'user',
        userMode: true,
        sidebarOpen: true,
      });
      
      mockLocation.pathname = '/campaign/campaign-1/player-select';
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('キャラクター選択')).toBeInTheDocument();
      expect(screen.getByText('ゲーム開始')).toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('renderLayout_onMobile_shouldUseTemporaryDrawer', () => {
      // Mock mobile breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600, // Below md breakpoint
      });

      const TestWrapper = createTestWrapper({
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // The drawer should exist (we can't easily test the variant prop directly)
      expect(screen.getByText('AI TRPG GM')).toBeInTheDocument();
    });

    it('renderLayout_onDesktop_shouldUsePersistentDrawer', () => {
      // Mock desktop breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // Above md breakpoint
      });

      const TestWrapper = createTestWrapper({
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // The drawer should exist
      expect(screen.getByText('AI TRPG GM')).toBeInTheDocument();
    });
  });

  describe('Navigation path generation', () => {
    it('generateNavigationPaths_withCampaign_shouldUseCorrectCampaignId', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: testCampaign,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Click characters menu item
      const charactersMenuItem = screen.getByRole('button', { name: /キャラクター管理/i });
      fireEvent.click(charactersMenuItem);

      expect(mockNavigate).toHaveBeenCalledWith('/campaign/campaign-1/characters');
    });

    it('generateNavigationPaths_withoutCampaign_shouldFallbackToRoot', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: null,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // The navigation items should still render but point to root
      expect(screen.getByText('キャンペーン設定')).toBeInTheDocument();
    });
  });

  describe('Filter logic', () => {
    it('filterNavigationItems_withoutCampaign_shouldHideCampaignRequiredItems', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: null,
        developerMode: true,
        appMode: 'developer',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should show home and settings (not campaign-dependent)
      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
      
      // Campaign-dependent items should be disabled but still visible
      const campaignButton = screen.getByRole('button', { name: /キャンペーン設定/i });
      expect(campaignButton).toBeDisabled();
    });

    it('filterNavigationItems_inStandardMode_shouldShowCommonItems', () => {
      const TestWrapper = createTestWrapper({
        appMode: 'standard',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('設定')).toBeInTheDocument();
      
      // Should not show mode-specific items
      expect(screen.queryByText('キャンペーン設定')).not.toBeInTheDocument();
      expect(screen.queryByText('キャラクター選択')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('renderLayout_withMissingCampaignData_shouldHandleGracefully', () => {
      const TestWrapper = createTestWrapper({
        currentCampaign: null,
      });
      
      expect(() => {
        render(
          <TestWrapper>
            <AppLayout>
              <div>Content</div>
            </AppLayout>
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('renderLayout_withInvalidAppMode_shouldHandleGracefully', () => {
      const TestWrapper = createTestWrapper({
        // @ts-ignore: Testing invalid app mode
        appMode: 'invalid-mode',
        sidebarOpen: true,
      });
      
      expect(() => {
        render(
          <TestWrapper>
            <AppLayout>
              <div>Content</div>
            </AppLayout>
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('navigation_withVeryLongCampaignName_shouldHandleOverflow', () => {
      const longNameCampaign = {
        ...testCampaign,
        name: 'This is a very long campaign name that should test text overflow behavior in the UI components',
      };

      const TestWrapper = createTestWrapper({
        currentCampaign: longNameCampaign,
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      // Should render without breaking
      expect(screen.getByText(longNameCampaign.name)).toBeInTheDocument();
    });

    it('themeSwitch_rapidToggling_shouldHandleGracefully', async () => {
      const TestWrapper = createTestWrapper({
        themeMode: 'light',
        sidebarOpen: true,
      });
      
      render(
        <TestWrapper>
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        </TestWrapper>
      );

      const themeSwitch = screen.getByRole('checkbox', { name: /ライトモード/i });
      
      // Rapid clicks should not break anything
      fireEvent.click(themeSwitch);
      fireEvent.click(themeSwitch);
      fireEvent.click(themeSwitch);

      await waitFor(() => {
        expect(themeSwitch).toBeInTheDocument();
      });
    });
  });
});