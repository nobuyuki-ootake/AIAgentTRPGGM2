import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Pagination,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  Badge,
  Tab,
  Tabs,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { ID } from '@ai-agent-trpg/types';
import { apiClient } from '../api/client';

interface AIRequestLog {
  id: string;
  timestamp: string;
  sessionId: ID;
  agentType: 'gm' | 'character' | 'chain';
  requestType: string;
  request: {
    endpoint: string;
    method: string;
    payload: any;
  };
  response: {
    success: boolean;
    data?: any;
    error?: string;
  };
  processingTime: number;
  appliedTactics?: any;
  entitiesProcessed?: number;
  metadata?: {
    characterId?: string;
    characterName?: string;
    locationId?: string;
    triggerType?: string;
    confidence?: number;
  };
}

interface AIRequestLogsResponse {
  logs: AIRequestLog[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AIRequestLogsAPI {
  getRequestLogs: (params: {
    page?: number;
    limit?: number;
    agentType?: string;
    sessionId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => Promise<AIRequestLogsResponse>;
  exportLogs: (params: any) => Promise<Blob>;
}

const aiRequestLogsAPI: AIRequestLogsAPI = {
  getRequestLogs: async (params): Promise<AIRequestLogsResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.agentType) queryParams.append('agentType', params.agentType);
    if (params.sessionId) queryParams.append('sessionId', params.sessionId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.search) queryParams.append('search', params.search);
    
    const response = await apiClient.get<AIRequestLogsResponse>(`/ai-agent/request-logs?${queryParams}`);
    return response;
  },
  exportLogs: async (params): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    
    if (params.agentType) queryParams.append('agentType', params.agentType);
    if (params.sessionId) queryParams.append('sessionId', params.sessionId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.search) queryParams.append('search', params.search);
    
    // Use the API base URL from the environment or default to localhost
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
    const url = `${apiBaseUrl}/ai-agent/request-logs/export?${queryParams}`;
    const response = await fetch(url);
    return response.blob();
  }
};

export const AIRequestLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AIRequestLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
  const [sessionIdFilter, setSessionIdFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // UI states
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AIRequestLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);

  // Load logs
  const loadLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pagination.limit,
        agentType: agentTypeFilter !== 'all' ? agentTypeFilter : undefined,
        sessionId: sessionIdFilter || undefined,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        search: searchQuery || undefined,
      };
      
      const response = await aiRequestLogsAPI.getRequestLogs(params);
      setLogs(response.logs);
      setTotalCount(response.totalCount);
      setPagination(response.pagination);
    } catch (err) {
      setError('ログの読み込みに失敗しました');
      console.error('Failed to load AI request logs:', err);
    } finally {
      setLoading(false);
    }
  }, [agentTypeFilter, sessionIdFilter, startDate, endDate, searchQuery, pagination.limit]);

  // Apply filters
  const handleApplyFilters = () => {
    loadLogs(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setAgentTypeFilter('all');
    setSessionIdFilter('');
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
  };

  // Export logs
  const handleExportLogs = async () => {
    try {
      const blob = await aiRequestLogsAPI.exportLogs({
        agentType: agentTypeFilter,
        sessionId: sessionIdFilter,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        search: searchQuery,
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-request-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('ログのエクスポートに失敗しました');
      console.error('Failed to export logs:', err);
    }
  };

  // Show log details
  const handleShowDetails = (log: AIRequestLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // Page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadLogs(page);
  };

  // Load initial data
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Agent type display names
  const agentTypeNames = {
    all: '全て',
    gm: 'GM Agent',
    character: 'Character Agent',
    chain: 'Agent Chain',
  };

  // Format processing time
  const formatProcessingTime = (time: number): string => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  // Get status color
  const getStatusColor = (success: boolean): any => {
    return success ? 'success' : 'error';
  };

  // Get agent type icon
  const getAgentTypeIcon = (agentType: string) => {
    switch (agentType) {
      case 'gm': return <PsychologyIcon />;
      case 'character': return <PersonIcon />;
      case 'chain': return <TimelineIcon />;
      default: return <PsychologyIcon />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            AI リクエストログ
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI Agent との通信ログを確認・分析できます
          </Typography>
        </Box>

        {/* フィルター */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon />
              フィルター設定
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Agent種別</InputLabel>
                  <Select
                    value={agentTypeFilter}
                    onChange={(e) => setAgentTypeFilter(e.target.value)}
                    label="Agent種別"
                    data-testid="agent-type-filter"
                  >
                    {Object.entries(agentTypeNames).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="セッションID"
                  value={sessionIdFilter}
                  onChange={(e) => setSessionIdFilter(e.target.value)}
                  data-testid="session-id-filter"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <DateTimePicker
                  label="開始日時"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <DateTimePicker
                  label="終了日時"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={8} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="検索キーワード"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  data-testid="search-filter"
                />
              </Grid>
              
              <Grid item xs={12} sm={4} md={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={handleApplyFilters}
                    disabled={loading}
                    startIcon={<SearchIcon />}
                    data-testid="apply-filters-button"
                  >
                    検索
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    disabled={loading}
                    startIcon={<ClearIcon />}
                  >
                    クリア
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* アクションバー */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6">
              ログ一覧 ({totalCount.toLocaleString()}件)
            </Typography>
            {loading && <CircularProgress size={20} />}
          </Box>
          
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => loadLogs(pagination.page)}
              disabled={loading}
              startIcon={<RefreshIcon />}
            >
              更新
            </Button>
            <Button
              variant="outlined"
              onClick={handleExportLogs}
              disabled={loading || logs.length === 0}
              startIcon={<DownloadIcon />}
              data-testid="export-logs-button"
            >
              エクスポート
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ログリスト */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {logs.length === 0 && !loading ? (
              <Box p={4} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  条件に一致するログが見つかりませんでした
                </Typography>
              </Box>
            ) : (
              <List>
                {logs.map((log, index) => {
                  const isExpanded = expandedLog === log.id;
                  return (
                    <Box key={log.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Badge
                            badgeContent={log.response.success ? <CheckCircleIcon /> : <ErrorIcon />}
                            color={getStatusColor(log.response.success)}
                          >
                            {getAgentTypeIcon(log.agentType)}
                          </Badge>
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                              <Typography variant="subtitle1">
                                {log.requestType}
                              </Typography>
                              <Chip
                                label={agentTypeNames[log.agentType as keyof typeof agentTypeNames]}
                                size="small"
                                color="primary"
                              />
                              <Chip
                                label={log.response.success ? '成功' : '失敗'}
                                size="small"
                                color={getStatusColor(log.response.success)}
                              />
                              {log.processingTime && (
                                <Chip
                                  label={formatProcessingTime(log.processingTime)}
                                  size="small"
                                  icon={<SpeedIcon />}
                                />
                              )}
                              {log.entitiesProcessed && (
                                <Chip
                                  label={`${log.entitiesProcessed}エンティティ`}
                                  size="small"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(log.timestamp).toLocaleString()}
                              </Typography>
                              {log.metadata?.characterName && (
                                <Typography variant="caption" color="text.secondary">
                                  キャラクター: {log.metadata.characterName}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        
                        <Box display="flex" gap={1}>
                          <Tooltip title="詳細を表示">
                            <IconButton
                              onClick={() => handleShowDetails(log)}
                              data-testid={`view-details-${log.id}`}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            data-testid={`expand-log-${log.id}`}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                      </ListItem>

                      <Collapse in={isExpanded}>
                        <Box sx={{ pl: 9, pr: 2, pb: 2 }}>
                          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              リクエスト概要
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>エンドポイント:</strong> {log.request.endpoint}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              <strong>メソッド:</strong> {log.request.method}
                            </Typography>
                            {log.appliedTactics && (
                              <Typography variant="body2" gutterBottom>
                                <strong>適用戦術:</strong> {JSON.stringify(log.appliedTactics)}
                              </Typography>
                            )}
                            {log.metadata?.confidence && (
                              <Typography variant="body2">
                                <strong>信頼度:</strong> {(log.metadata.confidence * 100).toFixed(1)}%
                              </Typography>
                            )}
                          </Paper>
                        </Box>
                      </Collapse>

                      {index < logs.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>

        {/* ページネーション */}
        {pagination.totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={3}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              disabled={loading}
              size="large"
            />
          </Box>
        )}

        {/* 詳細ダイアログ */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            ログ詳細 - {selectedLog?.requestType}
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
                  <Tab label="基本情報" />
                  <Tab label="リクエスト" />
                  <Tab label="レスポンス" />
                  <Tab label="メタデータ" />
                </Tabs>

                <Box sx={{ mt: 2 }}>
                  {currentTab === 0 && (
                    <Stack spacing={2}>
                      <Typography><strong>ID:</strong> {selectedLog.id}</Typography>
                      <Typography><strong>タイムスタンプ:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</Typography>
                      <Typography><strong>セッションID:</strong> {selectedLog.sessionId}</Typography>
                      <Typography><strong>Agentタイプ:</strong> {selectedLog.agentType}</Typography>
                      <Typography><strong>処理時間:</strong> {formatProcessingTime(selectedLog.processingTime)}</Typography>
                      <Typography><strong>ステータス:</strong> {selectedLog.response.success ? '成功' : '失敗'}</Typography>
                    </Stack>
                  )}

                  {currentTab === 1 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>リクエスト詳細</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {JSON.stringify(selectedLog.request, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  )}

                  {currentTab === 2 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>レスポンス詳細</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                          {JSON.stringify(selectedLog.response, null, 2)}
                        </pre>
                      </Paper>
                    </Box>
                  )}

                  {currentTab === 3 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>メタデータ</Typography>
                      <Stack spacing={2}>
                        {selectedLog.appliedTactics && (
                          <Box>
                            <Typography variant="subtitle2">適用戦術</Typography>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                                {JSON.stringify(selectedLog.appliedTactics, null, 2)}
                              </pre>
                            </Paper>
                          </Box>
                        )}
                        {selectedLog.metadata && (
                          <Box>
                            <Typography variant="subtitle2">その他メタデータ</Typography>
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                                {JSON.stringify(selectedLog.metadata, null, 2)}
                              </pre>
                            </Paper>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>
              閉じる
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};