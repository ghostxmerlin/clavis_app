import { useState, type ReactNode } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material'
import KeyIcon from '@mui/icons-material/Key'
import FolderIcon from '@mui/icons-material/Folder'
import BugReportIcon from '@mui/icons-material/BugReport'
import UsbIcon from '@mui/icons-material/Usb'
import ShieldIcon from '@mui/icons-material/Shield'

const DRAWER_WIDTH = 240

export type NavPage = 'passwords' | 'files' | 'usb-debug'

interface LayoutProps {
  page: NavPage
  onPageChange: (page: NavPage) => void
  children: ReactNode
  deviceInfo?: {
    manufacturer?: string
    product?: string
    serialNumber?: string
  }
}

export default function Layout({
  page,
  onPageChange,
  children,
  deviceInfo
}: LayoutProps): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: { id: NavPage; label: string; icon: ReactNode }[] = [
    { id: 'passwords', label: '密码管理', icon: <KeyIcon /> },
    { id: 'files', label: '加密文件', icon: <FolderIcon /> },
    { id: 'usb-debug', label: 'USB 调试', icon: <BugReportIcon /> }
  ]

  const drawer = (
    <Box sx={{ pt: 1 }}>
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 500, color: 'text.primary' }}>
          Clavis
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.id}
            selected={page === item.id}
            onClick={() => {
              onPageChange(item.id)
              setMobileOpen(false)
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: page === item.id ? 'primary.main' : 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: page === item.id ? 500 : 400 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
          WebkitAppRegion: 'drag'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' }, WebkitAppRegion: 'no-drag' }}
          >
            <KeyIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 400 }}>
            {page === 'passwords' ? '密码管理' : page === 'files' ? '加密文件' : 'USB 调试'}
          </Typography>

          <Tooltip title={deviceInfo?.product || 'Clavis Device'}>
            <Chip
              icon={<UsbIcon sx={{ fontSize: 16 }} />}
              label="已连接"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 500, WebkitAppRegion: 'no-drag' }}
            />
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: 10,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'background.default',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
