import React from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  MenuRounded,
  HomeRounded,
  CampaignRounded,
  PeopleRounded,
  TimelineRounded,
  SportsEsportsRounded,
  SettingsRounded,
  Brightness4Rounded,
  Brightness7Rounded,
  DeveloperModeRounded,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  sidebarOpenAtom,
  themeAtom,
  developerModeAtom,
  appModeAtom,
  userModeAtom,
  currentCampaignAtom,
  AppMode,
} from '@/store/atoms';

interface AppLayoutProps {
  children: React.ReactNode;
}

const DRAWER_WIDTH = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiresCampaign?: boolean;
  developerOnly?: boolean;
  userOnly?: boolean;
  modes?: AppMode[];
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useRecoilState(sidebarOpenAtom);
  const [themeMode, setThemeMode] = useRecoilState(themeAtom);
  const [developerMode, setDeveloperMode] = useRecoilState(developerModeAtom);
  const [appMode, setAppMode] = useRecoilState(appModeAtom);
  const [userMode, setUserMode] = useRecoilState(userModeAtom);
  const currentCampaign = useRecoilValue(currentCampaignAtom);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleThemeToggle = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  const handleDeveloperModeToggle = () => {
    const newDeveloperMode = !developerMode;
    setDeveloperMode(newDeveloperMode);
    
    // 開発者モードON = シナリオ編集モード、OFF = プレイヤーモード
    if (newDeveloperMode) {
      setAppMode('developer');
      setUserMode(false);
    } else {
      setAppMode('user');
      setUserMode(true);
    }
  };

  // const handleAppModeChange = (mode: AppMode) => {
  //   setAppMode(mode);
  //   setDeveloperMode(mode === 'developer');
  //   setUserMode(mode === 'user');
  // }; // 未使用

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'ホーム',
      icon: <HomeRounded />,
      path: '/',
      modes: ['standard', 'developer', 'user'],
    },
    // 開発者モード（GM向け）専用項目
    {
      id: 'campaign-setup',
      label: 'キャンペーン設定',
      icon: <CampaignRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/setup` : '/',
      requiresCampaign: true,
      modes: ['developer'],
    },
    {
      id: 'characters',
      label: 'キャラクター管理',
      icon: <PeopleRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/characters` : '/',
      requiresCampaign: true,
      modes: ['developer'],
    },
    {
      id: 'locations',
      label: '場所管理',
      icon: <LocationIcon />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/locations` : '/',
      requiresCampaign: true,
      modes: ['developer'],
    },
    {
      id: 'timeline',
      label: 'タイムライン',
      icon: <TimelineRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/timeline` : '/',
      requiresCampaign: true,
      modes: ['developer'],
    },
    {
      id: 'session',
      label: 'GMセッション',
      icon: <SportsEsportsRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/session` : '/',
      requiresCampaign: true,
      modes: ['developer'],
    },
    // ユーザーモード（プレイヤー向け）専用項目
    {
      id: 'player-select',
      label: 'キャラクター選択',
      icon: <PeopleRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/player-select` : '/',
      requiresCampaign: true,
      modes: ['user'],
    },
    {
      id: 'play-session',
      label: 'ゲーム開始',
      icon: <SportsEsportsRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/play` : '/',
      requiresCampaign: true,
      modes: ['user'],
    },
    // 共通項目
    {
      id: 'settings',
      label: '設定',
      icon: <SettingsRounded />,
      path: '/settings',
      modes: ['standard', 'developer', 'user'],
    },
  ];

  // セッション中（プレイ中）かどうかを判定
  const isInSession = location.pathname.includes('/play/');

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.requiresCampaign && !currentCampaign) return false;
    if (item.developerOnly && !developerMode) return false;
    if (item.userOnly && !userMode) return false;
    if (item.modes && !item.modes.includes(appMode)) return false;
    
    // セッション中はキャラクター選択を無効化
    if (isInSession && item.id === 'player-select') return false;
    
    return true;
  });

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* サイドバーヘッダー */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          AI TRPG GM
        </Typography>
        {currentCampaign && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {currentCampaign.name}
          </Typography>
        )}
      </Box>

      {/* ナビゲーションメニュー */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List>
          {filteredNavigationItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => navigate(item.path)}
                disabled={item.requiresCampaign && !currentCampaign}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main + '20',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main + '30',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 2,
                    justifyContent: 'center',
                    color: isActive(item.path) ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive(item.path) ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider />

      {/* サイドバーフッター */}
      <Box sx={{ p: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={themeMode === 'dark'}
              onChange={handleThemeToggle}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {themeMode === 'dark' ? <Brightness7Rounded /> : <Brightness4Rounded />}
              <Typography variant="caption">
                {themeMode === 'dark' ? 'ライト' : 'ダーク'}モード
              </Typography>
            </Box>
          }
          sx={{ mb: 1 }}
        />

        {/* アプリケーションモード表示 */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            現在: {developerMode ? 'シナリオ編集モード' : 'プレイヤーモード'}
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={developerMode}
              onChange={handleDeveloperModeToggle}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {developerMode ? <DeveloperModeRounded /> : <SportsEsportsRounded />}
              <Typography variant="caption">
                {developerMode ? 'シナリオ編集モード' : 'プレイヤーモード'}
              </Typography>
            </Box>
          }
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* アプリバー */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: sidebarOpen ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuRounded />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {currentCampaign ? currentCampaign.name : 'AI TRPG Game Master'}
          </Typography>

          {appMode !== 'standard' && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: appMode === 'developer' ? 'warning.main' : appMode === 'user' ? 'success.main' : 'info.main',
                color: appMode === 'developer' ? 'warning.contrastText' : appMode === 'user' ? 'success.contrastText' : 'info.contrastText',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                mr: 2,
              }}
            >
              {appMode === 'developer' ? 'DEV' : appMode === 'user' ? 'PLAYER' : 'STANDARD'}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* サイドバー */}
      <Box
        component="nav"
        sx={{ width: { md: sidebarOpen ? DRAWER_WIDTH : 0 }, flexShrink: { md: 0 } }}
      >
        {/* モバイル用の一時的なドロワー */}
        <Drawer
          variant="temporary"
          open={sidebarOpen && isMobile}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // モバイルでのパフォーマンス向上
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* デスクトップ用の永続的なドロワー */}
        <Drawer
          variant="persistent"
          open={sidebarOpen && !isMobile}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: sidebarOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* AppBarの高さ分のスペーサー */}
        {children}
      </Box>
    </Box>
  );
};