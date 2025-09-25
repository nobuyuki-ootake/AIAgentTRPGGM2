import React from 'react';
import {
  Box,
  Container,
  useMediaQuery,
  useTheme,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  styled
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useState } from 'react';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  title?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  padding?: number;
  showSidebar?: boolean;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  [theme.breakpoints.down('sm')]: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  [theme.breakpoints.up('sm')]: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
}));

const MobileDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: '280px',
    maxWidth: '80vw',
    [theme.breakpoints.down('sm')]: {
      width: '100vw',
      maxWidth: '100vw',
    },
  },
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
  },
}));

const MobileAppBar = styled(AppBar)(({ theme }) => ({
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

const DesktopSidebar = styled(Box)(({ theme }) => ({
  width: '280px',
  flexShrink: 0,
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));

export const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({
  children,
  sidebar,
  title = 'AI Agent TRPG GM',
  maxWidth = 'lg',
  padding = 2,
  showSidebar = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const closeMobileDrawer = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Mobile AppBar */}
      <MobileAppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          {showSidebar && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
        </Toolbar>
      </MobileAppBar>

      {/* Sidebar */}
      {showSidebar && sidebar && (
        <>
          {/* Mobile Drawer */}
          <MobileDrawer
            variant="temporary"
            open={mobileOpen}
            onClose={closeMobileDrawer}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton onClick={closeMobileDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>
            {sidebar}
          </MobileDrawer>

          {/* Desktop Sidebar */}
          <DesktopSidebar>
            <Box
              sx={{
                position: 'fixed',
                height: '100vh',
                overflow: 'auto',
                pt: 2,
                pl: 2,
                pr: 2,
                pb: 2,
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              {sidebar}
            </Box>
          </DesktopSidebar>
        </>
      )}

      {/* Main Content */}
      <MainContent>
        <Box
          sx={{
            mt: isMobile ? 8 : 0, // Account for mobile AppBar
            minHeight: '100vh',
          }}
        >
          <StyledContainer maxWidth={maxWidth}>
            <Box sx={{ py: padding }}>
              {children}
            </Box>
          </StyledContainer>
        </Box>
      </MainContent>
    </Box>
  );
};

export default MobileOptimizedLayout;