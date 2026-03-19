import { createTheme } from '@mui/material/styles'

// ── Clavis 复古终端风格 ──
// 黑底 + 绿色(#80C269)为主 + 白色为辅
const TERMINAL_GREEN = '#80C269'
const TERMINAL_GREEN_LIGHT = '#A3D98F'
const TERMINAL_GREEN_DARK = '#5A9A42'
const TERMINAL_BG = '#0D0D0D'
const TERMINAL_BG_PAPER = '#1A1A1A'
const TERMINAL_BG_ELEVATED = '#242424'
const TERMINAL_BORDER = '#2A2A2A'
const TERMINAL_WHITE = '#E0E0E0'
const TERMINAL_WHITE_DIM = '#888888'

const FONT_FAMILY = '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: TERMINAL_GREEN,
      light: TERMINAL_GREEN_LIGHT,
      dark: TERMINAL_GREEN_DARK
    },
    secondary: {
      main: TERMINAL_WHITE,
      light: '#FFFFFF',
      dark: TERMINAL_WHITE_DIM
    },
    background: {
      default: TERMINAL_BG,
      paper: TERMINAL_BG_PAPER
    },
    error: {
      main: '#FF5252'
    },
    warning: {
      main: '#FFB74D'
    },
    success: {
      main: TERMINAL_GREEN
    },
    text: {
      primary: TERMINAL_GREEN,
      secondary: TERMINAL_WHITE_DIM
    },
    divider: TERMINAL_BORDER
  },
  typography: {
    fontFamily: FONT_FAMILY,
    h4: {
      fontWeight: 400,
      fontSize: '1.75rem',
      color: TERMINAL_GREEN
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      color: TERMINAL_GREEN
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      color: TERMINAL_GREEN
    },
    body1: {
      fontSize: '0.875rem',
      color: TERMINAL_WHITE
    },
    body2: {
      fontSize: '0.8125rem',
      color: TERMINAL_WHITE_DIM
    }
  },
  shape: {
    borderRadius: 4
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: TERMINAL_BG,
          color: TERMINAL_GREEN,
          '&::-webkit-scrollbar': {
            width: 6
          },
          '&::-webkit-scrollbar-track': {
            background: TERMINAL_BG
          },
          '&::-webkit-scrollbar-thumb': {
            background: TERMINAL_BORDER,
            borderRadius: 3,
            '&:hover': {
              background: TERMINAL_GREEN_DARK
            }
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 4,
          padding: '6px 24px',
          fontFamily: FONT_FAMILY
        },
        contained: {
          backgroundColor: TERMINAL_GREEN_DARK,
          color: '#000000',
          '&:hover': {
            backgroundColor: TERMINAL_GREEN
          }
        },
        outlined: {
          borderColor: TERMINAL_GREEN_DARK,
          color: TERMINAL_GREEN,
          '&:hover': {
            borderColor: TERMINAL_GREEN,
            backgroundColor: 'rgba(128, 194, 105, 0.08)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: `1px solid ${TERMINAL_BORDER}`,
          backgroundColor: TERMINAL_BG_PAPER,
          boxShadow: 'none',
          '&:hover': {
            borderColor: TERMINAL_GREEN_DARK,
            boxShadow: `0 0 8px rgba(128, 194, 105, 0.15)`
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: TERMINAL_BG,
          color: TERMINAL_GREEN,
          boxShadow: 'none',
          borderBottom: `1px solid ${TERMINAL_BORDER}`
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          backgroundColor: TERMINAL_BG,
          borderRight: `1px solid ${TERMINAL_BORDER}`
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '0 4px 4px 0',
          marginRight: 12,
          color: TERMINAL_WHITE_DIM,
          '&:hover': {
            backgroundColor: 'rgba(128, 194, 105, 0.08)',
            color: TERMINAL_GREEN
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(128, 194, 105, 0.12)',
            color: TERMINAL_GREEN,
            '&:hover': {
              backgroundColor: 'rgba(128, 194, 105, 0.18)'
            }
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'inherit'
        }
      }
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundColor: TERMINAL_GREEN_DARK,
          color: '#000000',
          boxShadow: `0 0 12px rgba(128, 194, 105, 0.3)`,
          '&:hover': {
            backgroundColor: TERMINAL_GREEN
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          backgroundColor: TERMINAL_BG_PAPER,
          border: `1px solid ${TERMINAL_BORDER}`
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            color: TERMINAL_WHITE,
            '& fieldset': {
              borderColor: TERMINAL_BORDER
            },
            '&:hover fieldset': {
              borderColor: TERMINAL_GREEN_DARK
            },
            '&.Mui-focused fieldset': {
              borderColor: TERMINAL_GREEN
            }
          },
          '& .MuiInputLabel-root': {
            color: TERMINAL_WHITE_DIM,
            '&.Mui-focused': {
              color: TERMINAL_GREEN
            }
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY
        },
        outlined: {
          borderColor: TERMINAL_GREEN_DARK
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: TERMINAL_BG_ELEVATED,
          color: TERMINAL_GREEN,
          border: `1px solid ${TERMINAL_BORDER}`,
          fontFamily: FONT_FAMILY
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: TERMINAL_WHITE_DIM,
          '&:hover': {
            color: TERMINAL_GREEN,
            backgroundColor: 'rgba(128, 194, 105, 0.08)'
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: TERMINAL_BORDER
        }
      }
    }
  }
})

export default theme
