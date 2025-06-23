import React from 'react';
import { Snackbar, Alert, AlertTitle, Slide, SlideProps } from '@mui/material';
import { useRecoilState } from 'recoil';
import { notificationsAtom } from '@/store/atoms';

interface NotificationProviderProps {
  children: React.ReactNode;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useRecoilState(notificationsAtom);

  const handleClose = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const currentNotification = notifications[0];

  return (
    <>
      {children}
      
      <Snackbar
        open={!!currentNotification}
        autoHideDuration={
          currentNotification?.type === 'error' ? 8000 : 
            currentNotification?.type === 'warning' ? 6000 : 4000
        }
        onClose={() => currentNotification && handleClose(currentNotification.id)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
        sx={{ maxWidth: '400px' }}
      >
        {currentNotification && (
          <Alert
            onClose={() => handleClose(currentNotification.id)}
            severity={currentNotification.type}
            variant="filled"
            sx={{
              width: '100%',
              '& .MuiAlert-message': {
                wordBreak: 'break-word',
              },
            }}
          >
            {currentNotification.type === 'error' && (
              <AlertTitle>Error</AlertTitle>
            )}
            {currentNotification.type === 'warning' && (
              <AlertTitle>Warning</AlertTitle>
            )}
            {currentNotification.message}
          </Alert>
        )}
      </Snackbar>
    </>
  );
};

// 通知を追加するためのヘルパー関数
export const useNotification = () => {
  const [, setNotifications] = useRecoilState(notificationsAtom);

  const addNotification = React.useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
  ) => {
    const notification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString(),
    };

    setNotifications(prev => [...prev, notification]);

    // 自動削除（追加の安全策）
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
  }, [setNotifications]);

  return {
    showSuccess: (message: string) => addNotification('success', message),
    showError: (message: string) => addNotification('error', message),
    showWarning: (message: string) => addNotification('warning', message),
    showInfo: (message: string) => addNotification('info', message),
  };
};