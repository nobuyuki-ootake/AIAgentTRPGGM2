import React from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        設定
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI設定
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI統合機能の設定を行います。（実装予定）
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SettingsPage;