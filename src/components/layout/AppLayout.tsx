import React, { useLayoutEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemButton,
  ListItemText, 
  Divider, 
  IconButton, 
  Avatar,
  Menu,
  MenuItem,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  ViewWeek as ViewWeekIcon, 
  Analytics as AnalyticsIcon,
  History as HistoryIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  AccountCircle,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { usePartnership } from '../../context/PartnershipContext';

const drawerWidth = 240;
const bottomNavHeight = 56; // Height of bottom navigation bar for mobile

const AppLayout: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { activePartnership } = usePartnership();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileNav, setMobileNav] = React.useState(() => {
    const path = location.pathname;
    if (path.startsWith('/templates')) return 0;
    if (path.startsWith('/plans')) return 1;
    if (path.startsWith('/analytics')) return 2;
    if (path.startsWith('/logs')) return 3;
    return 0;
  });

  // Sync navigation state with URL changes (for refresh/direct navigation)
  React.useEffect(() => {
    const path = location.pathname;

    
    if (path.startsWith('/templates')) setMobileNav(0);
    else if (path.startsWith('/plans')) setMobileNav(1);
    else if (path.startsWith('/analytics')) setMobileNav(2);
    else if (path.startsWith('/logs')) setMobileNav(3);
  }, [location.pathname, mobileNav]);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };
  
  const menuItems = [
    { path: '/partnerships', label: 'Partnerships', icon: <ViewWeekIcon /> },
    { path: '/templates', label: 'Templates', icon: <DashboardIcon /> },
    { path: '/plans', label: 'Execution Plans', icon: <ViewWeekIcon /> },
    { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { path: '/logs', label: 'Logs', icon: <HistoryIcon /> },
  ];
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          TaskBuddy
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={isActive(item.path)}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
  
  // Handle mobile bottom navigation changes
  const handleBottomNavChange = (_event: React.SyntheticEvent, newValue: number) => {
    setMobileNav(newValue);
    switch (newValue) {
      case 0:
        navigate('/templates');
        break;
      case 1:
        navigate('/plans');
        break;
      case 2:
        navigate('/analytics');
        break;
      case 3:
        navigate('/logs');
        break;
    }
  };

  // Check if we're in a detail view (templateId or planId in path)
  const isDetailView = /\/templates\/[\w-]+|\/plans\/[\w-]+/.test(location.pathname);
  
  // Use layout effect to directly fix padding issues
  useLayoutEffect(() => {
    const fixPaddingIssue = () => {
      const mainElements = document.querySelectorAll('main');
      mainElements.forEach(main => {
        if (isMobile) {
          main.style.paddingBottom = `${bottomNavHeight + 24}px`; // Increased padding
          main.style.marginBottom = '0';
          main.style.height = 'auto';
          main.style.overflowY = 'auto'; // Ensure scrolling works properly
          main.style.position = 'relative'; // Ensure positioning context is correct
        }
      });
    };
    
    fixPaddingIssue();
    window.addEventListener('resize', fixPaddingIssue);
    
    return () => window.removeEventListener('resize', fixPaddingIssue);
  }, [isMobile, bottomNavHeight]);
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100%', height: '100%', flexDirection: isMobile ? 'column' : 'row' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && isDetailView ? (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => navigate(-1)}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          ) : isMobile ? (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {activePartnership ? (
              <>TaskBuddy | {activePartnership.name}</>
            ) : (
              'TaskBuddy'
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {currentUser && (
              <>
                <Button 
                  color="inherit" 
                  onClick={handleMenuOpen}
                  startIcon={
                    currentUser.photoURL ? 
                      <Avatar src={currentUser.photoURL} sx={{ width: 32, height: 32 }} /> : 
                      <AccountCircle />
                  }
                >
                  {currentUser.displayName}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleSignOut}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Sign Out" />
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        className="main-content"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          px: { xs: 2, sm: 3 }, // Set horizontal padding explicitly
          pt: { xs: '64px !important', sm: '64px !important' },
          pb: { xs: `${bottomNavHeight + 24}px !important`, sm: '16px' }, // Add bottom padding for mobile
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto', // Enable scrolling
          height: '100%', // Take full height
          position: 'relative', // Ensure proper positioning context
        }}
      >
        <Outlet />
      </Box>
      
      {/* Bottom navigation for mobile */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1100,
            height: `${bottomNavHeight}px`, // Explicitly set height
            boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' // Add shadow to make it stand out
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={mobileNav}
            onChange={handleBottomNavChange}
            showLabels
          >
            <BottomNavigationAction label="Templates" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Plans" icon={<ViewWeekIcon />} />
            <BottomNavigationAction label="Analytics" icon={<AnalyticsIcon />} />
            <BottomNavigationAction label="Logs" icon={<HistoryIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default AppLayout;