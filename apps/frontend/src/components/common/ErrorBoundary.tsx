import React from 'react';
import { Box, Typography, Button, Alert, Container } from '@mui/material';
import { RefreshRounded, BugReportRounded } from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });

    // エラー報告サービスに送信（実装時）
    // reportError(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="60vh"
            textAlign="center"
          >
            <BugReportRounded
              sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
            />
            
            <Typography variant="h4" gutterBottom>
              エラーが発生しました
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              申し訳ございませんが、予期しないエラーが発生しました。
              ページをリロードしていただくか、しばらく時間をおいてから再度お試しください。
            </Typography>

            <Box sx={{ mb: 3, width: '100%' }}>
              <Alert severity="error" sx={{ textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  エラーの詳細:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {this.state.error?.message}
                </Typography>
              </Alert>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshRounded />}
                onClick={this.handleReload}
              >
                ページをリロード
              </Button>
              
              <Button
                variant="outlined"
                onClick={this.handleReset}
              >
                エラーを閉じる
              </Button>
            </Box>

            {import.meta.env.DEV && this.state.errorInfo && (
              <Box sx={{ mt: 4, width: '100%' }}>
                <Alert severity="info">
                  <Typography variant="subtitle2" gutterBottom>
                    開発者情報 (スタックトレース):
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      fontSize: '0.7rem',
                      overflow: 'auto',
                      maxHeight: '200px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}