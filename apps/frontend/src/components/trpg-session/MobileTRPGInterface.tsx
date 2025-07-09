import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Fab,
  Badge,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Chip,
  styled,
} from '@mui/material';
import {
  Chat as ChatIcon,
  People as PeopleIcon,
  Casino as DiceIcon,
  Map as MapIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { TouchButton, TouchIconButton, TouchFab } from '../common/TouchOptimizedComponents';

interface MobileTRPGInterfaceProps {
  children: React.ReactNode;
  chatComponent?: React.ReactNode;
  charactersComponent?: React.ReactNode;
  diceComponent?: React.ReactNode;
  mapComponent?: React.ReactNode;
  settingsComponent?: React.ReactNode;
  notifications?: number;
  onNotificationsClick?: () => void;
}

const StyledTabs = styled(Tabs)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    minHeight: '56px',
    '& .MuiTab-root': {
      minHeight: '56px',
      minWidth: '20%',
      padding: theme.spacing(1, 0.5),
      fontSize: '0.75rem',
    },
  },
}));

const MobileTabPanel = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    height: 'calc(100vh - 112px)', // Full height minus tabs and status bar
    overflow: 'auto',
    position: 'relative',
  },
}));

const FloatingActionButtons = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

const MobileDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: '100vw',
    height: '80vh',
    bottom: 0,
    top: 'auto',
    borderTopLeftRadius: theme.spacing(2),
    borderTopRightRadius: theme.spacing(2),
  },
}));

const QuickActionsBar = styled(Paper)(({ theme }) => ({
  [theme.breakpoints.down('md')]: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1100,
    padding: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mobile-tabpanel-${index}`}
      aria-labelledby={`mobile-tab-${index}`}
    >
      {value === index && (
        <MobileTabPanel>{children}</MobileTabPanel>
      )}
    </div>
  );
};

export const MobileTRPGInterface: React.FC<MobileTRPGInterfaceProps> = ({
  children,
  chatComponent,
  charactersComponent,
  diceComponent,
  mapComponent,
  settingsComponent,
  notifications = 0,
  onNotificationsClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<React.ReactNode>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const openDrawer = (content: React.ReactNode) => {
    setDrawerContent(content);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerContent(null);
  };

  if (!isMobile) {
    // Desktop layout
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Main Content Tabs */}
      <StyledTabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Tab
          icon={<ChatIcon />}
          label="Chat"
          id="mobile-tab-0"
          aria-controls="mobile-tabpanel-0"
        />
        <Tab
          icon={<PeopleIcon />}
          label="Characters"
          id="mobile-tab-1"
          aria-controls="mobile-tabpanel-1"
        />
        <Tab
          icon={<DiceIcon />}
          label="Dice"
          id="mobile-tab-2"
          aria-controls="mobile-tabpanel-2"
        />
        <Tab
          icon={<MapIcon />}
          label="Map"
          id="mobile-tab-3"
          aria-controls="mobile-tabpanel-3"
        />
        <Tab
          icon={<SettingsIcon />}
          label="Settings"
          id="mobile-tab-4"
          aria-controls="mobile-tabpanel-4"
        />
      </StyledTabs>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {chatComponent || children}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {charactersComponent || (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Characters</Typography>
            <Typography variant="body2" color="text.secondary">
              Character management will be displayed here
            </Typography>
          </Box>
        )}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {diceComponent || (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Dice Rolling</Typography>
            <Typography variant="body2" color="text.secondary">
              Dice rolling interface will be displayed here
            </Typography>
          </Box>
        )}
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        {mapComponent || (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Map & Locations</Typography>
            <Typography variant="body2" color="text.secondary">
              Map and location management will be displayed here
            </Typography>
          </Box>
        )}
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        {settingsComponent || (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">Settings</Typography>
            <Typography variant="body2" color="text.secondary">
              Session settings will be displayed here
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Floating Action Buttons */}
      <FloatingActionButtons>
        {notifications > 0 && (
          <Badge badgeContent={notifications} color="error">
            <TouchFab
              size="small"
              color="secondary"
              onClick={onNotificationsClick}
            >
              <NotificationsIcon />
            </TouchFab>
          </Badge>
        )}
      </FloatingActionButtons>

      {/* Mobile Drawer */}
      <MobileDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            overflowY: 'auto',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Quick Actions</Typography>
            <TouchIconButton onClick={closeDrawer}>
              <CloseIcon />
            </TouchIconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {drawerContent}
        </Box>
      </MobileDrawer>

      {/* Quick Actions Bar */}
      <QuickActionsBar elevation={8}>
        <TouchButton
          variant="outlined"
          size="small"
          startIcon={<DiceIcon />}
          onClick={() => openDrawer(diceComponent)}
        >
          Roll
        </TouchButton>
        <TouchButton
          variant="outlined"
          size="small"
          startIcon={<PeopleIcon />}
          onClick={() => openDrawer(charactersComponent)}
        >
          Characters
        </TouchButton>
        <TouchButton
          variant="outlined"
          size="small"
          startIcon={<MapIcon />}
          onClick={() => openDrawer(mapComponent)}
        >
          Map
        </TouchButton>
        <TouchButton
          variant="outlined"
          size="small"
          startIcon={<MenuIcon />}
          onClick={() => openDrawer(settingsComponent)}
        >
          Menu
        </TouchButton>
      </QuickActionsBar>
    </Box>
  );
};

export default MobileTRPGInterface;