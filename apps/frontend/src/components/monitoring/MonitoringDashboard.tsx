import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  useTheme,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

interface MonitoringDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  alerts: Alert[];
  metrics: {
    cpu: number;
    memory: number;
    storage: number;
    responseTime: number;
    errorRate: number;
  };
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  activeConnections: number;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isVisible,
  onClose,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/monitoring/health');
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/performance/metrics');
      const data = await response.json();
      setPerformanceMetrics(data);
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    }
  };

  const fetchErrorDetails = async () => {
    try {
      const response = await fetch('/api/monitoring/errors/metrics');
      const data = await response.json();
      setErrorDetails(data.recentErrors || []);
    } catch (error) {
      console.error('Failed to fetch error details:', error);
    }
  };

  const fetchCacheStats = async () => {
    try {
      const response = await fetch('/api/monitoring/cache/stats');
      const data = await response.json();
      setCacheStats(data);
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSystemHealth(),
      fetchPerformanceMetrics(),
      fetchErrorDetails(),
      fetchCacheStats(),
    ]);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (isVisible) {
      refreshData();
      const interval = setInterval(refreshData, 30000); // 30秒ごと
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'critical':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'critical':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon />;
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ReactNode;
    color?: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, unit, icon, color, trend }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" color={color}>
              {value}{unit}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          <Box color={color}>{icon}</Box>
        </Box>
        {trend && (
          <Box mt={1}>
            <Chip
              size="small"
              label={trend}
              color={trend === 'up' ? 'error' : trend === 'down' ? 'success' : 'default'}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const SystemOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader
            title="System Health"
            action={
              <Box display="flex" alignItems="center">
                {systemHealth && getStatusIcon(systemHealth.status)}
                <Tooltip title="Refresh">
                  <IconButton onClick={refreshData} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />
          <CardContent>
            {systemHealth && (
              <Box>
                <Typography variant="h6" color={getStatusColor(systemHealth.status)}>
                  {systemHealth.status.toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </Typography>
                
                {systemHealth.alerts.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2">Active Alerts:</Typography>
                    {systemHealth.alerts.map((alert, index) => (
                      <Alert key={index} severity={alert.type} sx={{ mt: 1 }}>
                        {alert.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Resource Usage" />
          <CardContent>
            {systemHealth && (
              <Box>
                <Box mb={2}>
                  <Typography variant="body2">CPU Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth.metrics.cpu}
                    sx={{ mt: 1, height: 8 }}
                  />
                  <Typography variant="caption">{systemHealth.metrics.cpu}%</Typography>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2">Memory Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth.metrics.memory}
                    sx={{ mt: 1, height: 8 }}
                  />
                  <Typography variant="caption">{systemHealth.metrics.memory}%</Typography>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2">Storage Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth.metrics.storage}
                    sx={{ mt: 1, height: 8 }}
                  />
                  <Typography variant="caption">{systemHealth.metrics.storage}%</Typography>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Response Time"
          value={performanceMetrics?.averageResponseTime || 0}
          unit="ms"
          icon={<SpeedIcon />}
          color={theme.palette.primary.main}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Error Rate"
          value={performanceMetrics?.errorRate || 0}
          unit="%"
          icon={<ErrorIcon />}
          color={theme.palette.error.main}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Cache Hit Rate"
          value={cacheStats?.hitRate || 0}
          unit="%"
          icon={<StorageIcon />}
          color={theme.palette.success.main}
        />
      </Grid>

      <Grid item xs={12} md={3}>
        <MetricCard
          title="Active Connections"
          value={performanceMetrics?.activeConnections || 0}
          icon={<TimelineIcon />}
          color={theme.palette.info.main}
        />
      </Grid>
    </Grid>
  );

  const PerformanceTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Response Time Trend" />
          <CardContent>
            <Line
              data={{
                labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
                datasets: [{
                  label: 'Response Time (ms)',
                  data: [250, 280, 230, 210, 190, 220],
                  borderColor: theme.palette.primary.main,
                  backgroundColor: theme.palette.primary.main + '20',
                  tension: 0.4,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  }
                }
              }}
              height={200}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Error Rate Distribution" />
          <CardContent>
            <Doughnut
              data={{
                labels: ['Success', 'Client Error', 'Server Error'],
                datasets: [{
                  data: [95, 3, 2],
                  backgroundColor: [
                    theme.palette.success.main,
                    theme.palette.warning.main,
                    theme.palette.error.main,
                  ],
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
              height={200}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const ErrorsTab = () => (
    <Card>
      <CardHeader title="Recent Errors" />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Component</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Severity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {errorDetails.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>{error.component}</TableCell>
                  <TableCell>{error.message}</TableCell>
                  <TableCell>
                    <Chip
                      label={error.severity}
                      color={error.severity === 'critical' ? 'error' : 
                            error.severity === 'high' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  const CacheTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Cache Statistics" />
          <CardContent>
            {cacheStats && (
              <Box>
                <Typography variant="h6">
                  Hit Rate: {cacheStats.hitRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  Total Keys: {cacheStats.totalKeys}
                </Typography>
                <Typography variant="body2">
                  Total Hits: {cacheStats.totalHits}
                </Typography>
                <Typography variant="body2">
                  Total Misses: {cacheStats.totalMisses}
                </Typography>
                <Typography variant="body2">
                  Memory Usage: {(cacheStats.memoryUsage / 1024 / 1024).toFixed(1)} MB
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Top Cache Keys" />
          <CardContent>
            <List>
              {cacheStats?.topKeys?.map((key: any, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <StorageIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={key.key.substring(0, 50)}
                    secondary={`Hits: ${key.hits} | Size: ${(key.size / 1024).toFixed(1)}KB`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const TabPanel: React.FC<{ children?: React.ReactNode; index: number; value: number }> = ({
    children,
    value,
    index,
  }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Dialog open={isVisible} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">System Monitoring Dashboard</Typography>
          <Box>
            <Tooltip title="Settings">
              <IconButton>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={refreshData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Performance" />
            <Tab label="Errors" />
            <Tab label="Cache" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <SystemOverview />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <PerformanceTab />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <ErrorsTab />
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <CacheTab />
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MonitoringDashboard;