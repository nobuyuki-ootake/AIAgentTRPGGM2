import React from 'react';
import { Snackbar, Alert, AlertTitle, Slide, SlideProps, Box, Typography, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, Close } from '@mui/icons-material';
import { useRecoilState } from 'recoil';
import { notificationsAtom } from '@/store/atoms';
import { setGlobalNotificationCallback } from '@/api/client';

interface NotificationProviderProps {
  children: React.ReactNode;
}

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useRecoilState(notificationsAtom);
  const [expandedDetails, setExpandedDetails] = React.useState<string | null>(null);

  // グローバル通知システムの初期化
  React.useEffect(() => {
    const globalNotificationHandler = (
      type: '404-error' | 'error', 
      message: string, 
      options?: { details?: string }
    ) => {
      const notification = {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: new Date().toISOString(),
        persistent: true, // APIエラーは常に手動で閉じる
        details: options?.details,
      };

      setNotifications(prev => [...prev, notification]);
    };

    setGlobalNotificationCallback(globalNotificationHandler);

    // クリーンアップ
    return () => {
      setGlobalNotificationCallback(null);
    };
  }, [setNotifications]);

  const handleClose = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const toggleDetails = (notificationId: string) => {
    setExpandedDetails(prev => prev === notificationId ? null : notificationId);
  };

  const currentNotification = notifications[0];

  // エラー系は基本的に表示時間制限なし、情報系のみ自動で消える
  const getAutoHideDuration = (notification: any) => {
    // エラー・警告・404エラーは手動で閉じるまで表示し続ける
    if (notification?.type === 'error' || 
        notification?.type === 'warning' || 
        notification?.type === '404-error' ||
        notification?.persistent) {
      return null; // 表示時間制限なし
    }
    // 成功・情報通知のみ自動で消える
    return notification?.type === 'success' ? 4000 : 
           notification?.type === 'info' ? 6000 : null;
  };

  // 404エラー用の色とアイコン設定
  const getAlertSeverity = (type: string) => {
    return type === '404-error' ? 'error' : type;
  };

  return (
    <>
      {children}
      
      <Snackbar
        open={!!currentNotification}
        autoHideDuration={getAutoHideDuration(currentNotification)}
        onClose={() => currentNotification && !currentNotification.persistent && handleClose(currentNotification.id)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={SlideTransition}
        sx={{ maxWidth: '500px' }}
      >
        {currentNotification && (
          <Alert
            severity={getAlertSeverity(currentNotification.type)}
            variant="filled"
            sx={{
              width: '100%',
              backgroundColor: currentNotification.type === '404-error' ? '#d32f2f' : undefined,
              '& .MuiAlert-message': {
                wordBreak: 'break-word',
                width: '100%',
              },
            }}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={() => handleClose(currentNotification.id)}
                sx={{ p: 0.5 }}
              >
                <Close fontSize="small" />
              </IconButton>
            }
          >
            <Box>
              {/* エラータイトル */}
              {currentNotification.type === '404-error' && (
                <AlertTitle sx={{ color: 'white', fontWeight: 'bold' }}>
                  ❌ API Endpoint Not Found (404)
                </AlertTitle>
              )}
              {currentNotification.type === 'error' && currentNotification.type !== '404-error' && (
                <AlertTitle>Error</AlertTitle>
              )}
              {currentNotification.type === 'warning' && (
                <AlertTitle>Warning</AlertTitle>
              )}
              
              {/* メインメッセージ */}
              <Typography variant="body2" sx={{ color: 'white' }}>
                {currentNotification.message}
              </Typography>
              
              {/* 詳細表示ボタン（404エラーの場合） */}
              {currentNotification.type === '404-error' && currentNotification.details && (
                <Box sx={{ mt: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => toggleDetails(currentNotification.id)}
                    sx={{ color: 'white', p: 0.5 }}
                  >
                    {expandedDetails === currentNotification.id ? <ExpandLess /> : <ExpandMore />}
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {expandedDetails === currentNotification.id ? 'Hide Details' : 'Show Details'}
                    </Typography>
                  </IconButton>
                  
                  <Collapse in={expandedDetails === currentNotification.id}>
                    <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: 'white', fontFamily: 'monospace' }}>
                        {currentNotification.details}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
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
    type: 'success' | 'error' | 'warning' | 'info' | '404-error',
    message: string,
    options?: { 
      persistent?: boolean; 
      details?: string;
    }
  ) => {
    const notification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date().toISOString(),
      persistent: options?.persistent,
      details: options?.details,
    };

    setNotifications(prev => [...prev, notification]);

    // エラー系以外のみ自動削除の安全策を適用
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 10000);
    }
  }, [setNotifications]);

  return {
    showSuccess: (message: string) => addNotification('success', message),
    showError: (message: string, details?: string) => addNotification('error', message, { details }),
    showWarning: (message: string, details?: string) => addNotification('warning', message, { details }),
    showInfo: (message: string) => addNotification('info', message),
    show404Error: (endpoint: string, method: string = 'GET', details?: string) => {
      const message = `API endpoint not found: ${method} ${endpoint}`;
      const errorDetails = details || `The requested endpoint "${endpoint}" is not implemented on the server. This may indicate:\n• Missing API route implementation\n• Incorrect endpoint URL\n• Server configuration issues`;
      addNotification('404-error', message, { 
        persistent: true, 
        details: errorDetails 
      });
    },
  };
};