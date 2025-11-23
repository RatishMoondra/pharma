// src/components/ERPPage.jsx
import { Box, Paper, Typography, Divider } from "@mui/material";

export default function ERPPage({ title, icon, children, actions }) {
  return (
    <Box sx={{ p: 2, minHeight: "calc(100vh - 64px)" }}>
      {/* PAGE HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {icon}
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>

        {/* ACTION BUTTONS (optional) */}
        {actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}
      </Paper>

      {/* PAGE BODY */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}
