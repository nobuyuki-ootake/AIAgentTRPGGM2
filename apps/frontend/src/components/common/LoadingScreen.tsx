import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  size = 'medium',
  fullScreen = true,
}) => {
  const theme = useTheme();
  
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'medium':
        return 48;
      case 'large':
        return 64;
      default:
        return 48;
    }
  };

  const containerSx = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
        zIndex: theme.zIndex.modal,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        width: '100%',
      };

  return (
    <Box sx={containerSx}>
      <CircularProgress
        size={getSizeValue()}
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          mb: 2,
        }}
      />
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mt: 1,
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};