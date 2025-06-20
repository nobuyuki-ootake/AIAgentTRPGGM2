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
  currentCampaignAtom,
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
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarOpen, setSidebarOpen] = useRecoilState(sidebarOpenAtom);
  const [themeMode, setThemeMode] = useRecoilState(themeAtom);
  const [developerMode, setDeveloperMode] = useRecoilState(developerModeAtom);
  const currentCampaign = useRecoilValue(currentCampaignAtom);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleThemeToggle = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  const handleDeveloperModeToggle = () => {
    setDeveloperMode(!developerMode);
  };

  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'ホーム',
      icon: <HomeRounded />,
      path: '/',
    },
    {
      id: 'campaign-setup',
      label: 'キャンペーン設定',
      icon: <CampaignRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/setup` : '/',
      requiresCampaign: true,
    },
    {
      id: 'characters',
      label: 'キャラクター管理',
      icon: <PeopleRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/characters` : '/',
      requiresCampaign: true,
    },
    {
      id: 'locations',
      label: '場所管理',
      icon: <LocationIcon />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/locations` : '/',
      requiresCampaign: true,
    },
    {
      id: 'timeline',
      label: 'タイムライン',
      icon: <TimelineRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/timeline` : '/',
      requiresCampaign: true,
    },
    {
      id: 'session',
      label: 'TRPGセッション',
      icon: <SportsEsportsRounded />,
      path: currentCampaign ? `/campaign/${currentCampaign.id}/session` : '/',
      requiresCampaign: true,
    },
    {
      id: 'settings',
      label: '設定',
      icon: <SettingsRounded />,
      path: '/settings',
    },
  ];

  const filteredNavigationItems = navigationItems.filter(item => {
    if (item.requiresCampaign && !currentCampaign) return false;
    if (item.developerOnly && !developerMode) return false;
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
              <DeveloperModeRounded />
              <Typography variant="caption">開発者モード</Typography>
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

          {developerMode && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'warning.main',
                color: 'warning.contrastText',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                mr: 2,
              }}
            >
              DEV
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