import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  EventNote as EventIcon,
  Schedule as ScheduleIcon,
  CardMembership as SubscriptionIcon,
  AccountCircle as ProfileIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Domain as ClinicIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 260;

export const MainLayout: React.FC = () => {
  const { user, logout, impersonatedClinic, setImpersonatedClinic } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine what list items are shown based on role & impersonation context
  const showOwnerItems = user?.role === 'CLINIC_OWNER' || (user?.role === 'SUPER_ADMIN' && !!impersonatedClinic);
  const showAdminItems = user?.role === 'SUPER_ADMIN' && !impersonatedClinic;

  interface SidebarItem {
    text: string;
    icon: React.ReactElement;
    path?: string;
    action?: 'logout';
  }

  const sidebarItems: SidebarItem[] = [];

  // Common Dashboard
  sidebarItems.push({ text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' });

  // Clinic Owner items
  if (showOwnerItems) {
    sidebarItems.push(
      { text: 'Patients', icon: <PeopleIcon />, path: '/patients' },
      { text: "Today's Appointments", icon: <ScheduleIcon />, path: '/appointments/today' },
      { text: 'Upcoming Appointments', icon: <EventIcon />, path: '/appointments/upcoming' },
      { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
      { text: 'Clinic Settings', icon: <SettingsIcon />, path: '/settings' },
      { text: 'Subscription', icon: <SubscriptionIcon />, path: '/subscription' }
    );
  }

  // Super Admin items
  if (showAdminItems) {
    sidebarItems.push(
      { text: 'Clinics', icon: <ClinicIcon />, path: '/admin/clinics' },
      { text: 'Subscriptions Overview', icon: <SubscriptionIcon />, path: '/admin/subscriptions' },
      { text: 'System Dashboard', icon: <AdminIcon />, path: '/admin/dashboard' }
    );
  }

  // Common User profile and session control
  sidebarItems.push(
    { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
    { text: 'Logout', icon: <LogoutIcon />, action: 'logout' }
  );

  const handleItemClick = (item: SidebarItem) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.path) {
      navigate(item.path);
      if (isMobile) {
        setOpen(false);
      }
    }
  };

  // Impersonation Banner Height adjustment offset
  const hasBanner = user?.role === 'SUPER_ADMIN' && !!impersonatedClinic;
  const topOffset = hasBanner ? 104 : 64;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Active Impersonation Banner */}
        {hasBanner && impersonatedClinic && (
          <Box
            id="impersonation-banner"
            sx={{
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              px: 2,
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minHeight: 40,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Viewing clinic as owner: {impersonatedClinic.name}
            </Typography>
            <Button
              id="exit-impersonation-btn"
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setImpersonatedClinic(null)}
              sx={{ py: 0, height: 24, fontSize: '0.75rem', fontWeight: 700 }}
            >
              Exit Impersonation
            </Button>
          </Box>
        )}
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              aria-label="open navigation sidebar"
              onClick={handleDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontFamily: 'Outfit', fontWeight: 700, letterSpacing: 0.5 }}
            >
              DentFlow
            </Typography>
            {(user?.clinic || impersonatedClinic) && (
              <Typography
                variant="caption"
                sx={{
                  ml: 2,
                  bgcolor: 'primary.dark',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 500,
                  display: { xs: 'none', sm: 'inline-block' },
                }}
              >
                {user?.clinic?.name || impersonatedClinic?.name}
              </Typography>
            )}
          </Box>
          <Box>
            <IconButton
              onClick={handleMenuOpen}
              sx={{ p: 0 }}
              aria-label="user profile menu"
              aria-controls="profile-menu"
              aria-haspopup="true"
            >
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.9rem', fontWeight: 600 }}>
                {user?.username?.substring(0, 2).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><ProfileIcon fontSize="small" /></ListItemIcon>
                Profile Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ height: topOffset }} /> {/* Toolbar height offset */}
        <Box
          component="nav"
          aria-label="Main Navigation"
          sx={{ overflow: 'auto', p: 1, flexGrow: 1 }}
        >
          <List>
            {sidebarItems.map((item) => {
              const isSelected = item.path ? location.pathname === item.path : false;
              const isLogout = item.action === 'logout';
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleItemClick(item)}
                    sx={{
                      borderRadius: 1,
                      color: isSelected ? 'primary.contrastText' : 'text.primary',
                      '&.Mui-selected': {
                        bgcolor: isLogout ? 'error.main' : 'primary.main',
                        color: isLogout ? 'error.contrastText' : 'primary.contrastText',
                        '& .MuiListItemIcon-root': {
                          color: isLogout ? 'error.contrastText' : 'primary.contrastText',
                        },
                        '&:hover': {
                          bgcolor: isLogout ? 'error.dark' : 'primary.dark',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected
                          ? (isLogout ? 'error.contrastText' : 'primary.contrastText')
                          : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.text}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>

      {/* Main Viewport */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && !isMobile && {
            marginLeft: 0,
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
          ...(!open && !isMobile && {
            marginLeft: `-${drawerWidth}px`,
          }),
        }}
      >
        <Box sx={{ height: topOffset }} /> {/* Toolbar offset */}
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
