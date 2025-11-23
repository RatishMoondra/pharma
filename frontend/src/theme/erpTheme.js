// src/theme/erpTheme.js
// Enterprise-grade ERP Theme for MUI (compact, sharp, neutral, professional)

import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material";

export const erpTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1A73E8",    // clean enterprise blue
      dark: "#1558B0",
    },
    secondary: {
      main: "#6C757D",    // neutral grey for secondary buttons
    },
    background: {
      default: "#F5F7FA", // subtle ERP background
      paper: "#FFFFFF",
    },
    success: {
      main: "#2E7D32",
      light: "#E8F5E9",
    },
    warning: {
      main: "#ED6C02",
    },
    error: {
      main: "#D33030",
    },
  },

  shape: {
    borderRadius: 6,
  },

  typography: {
    fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
    h5: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },

  spacing: 6, // slightly tighter spacing

  components: {
    // BUTTONS
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: "0.85rem",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            backgroundColor: alpha("#1A73E8", 0.15),
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },

    // CARDS / PAPER
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #E0E4EA",
          boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
        },
      },
    },

    // TEXTFIELDS (compact)
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "0.85rem",
        },
      },
    },

    // SELECTS
    MuiSelect: {
      defaultProps: { size: "small" },
      styleOverrides: {
        outlined: {
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },

    // ACCORDION
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #E3E7ED",
          "&:before": { display: "none" },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 42,
          "& .MuiAccordionSummary-content": {
            margin: 0,
            alignItems: "center",
          },
        },
      },
    },

    // DIALOG
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          paddingBottom: 8,
        },
      },
    },

    // MENU
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.87rem",
          padding: "6px 12px",
        },
      },
    },

    // DATA GRID (GLOBAL OVERRIDES)
    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: "1px solid #D3D9E2",
        },
        columnHeaders: {
          backgroundColor: "#F1F3F7",
          color: "#333",
          fontWeight: 700,
          fontSize: "0.85rem",
          borderBottom: "1px solid #D3D9E2",
        },
        cell: {
          fontSize: "0.82rem",
          padding: "4px 8px",
        },
        row: {
          "&:hover": {
            backgroundColor: "#F7FAFF",
          },
        },
      },
    },

    // TOOLBAR
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
  },
});
