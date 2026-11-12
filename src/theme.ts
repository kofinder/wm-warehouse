import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#eb572b' },
    secondary: { main: '#10a69a' },
    background: { default: '#f4f7fb', paper: '#ffffff' },
    text: { primary: '#182b46', secondary: '#748297' },
    divider: '#e5ebf2',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.035em' },
    h5: { fontWeight: 800, letterSpacing: '-0.025em' },
    h6: { fontWeight: 800, letterSpacing: '-0.015em' },
    subtitle1: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { boxShadow: '0 2px 12px rgba(22, 49, 83, 0.035)' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});
