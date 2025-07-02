import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMoreRounded,
  AutoStoriesRounded,
  TheaterComedyRounded,
  EmojiEventsRounded,
  HelpRounded,
  PsychologyRounded,
  FlashOnRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import { useRecoilValue } from 'recoil';
import { narrativeFeedbacksAtom, type NarrativeFeedback } from '../../store/atoms';

interface NarrativeFeedbackDisplayProps {
  sessionId?: string;
  compact?: boolean;
  maxItems?: number;
}

export const NarrativeFeedbackDisplay: React.FC<NarrativeFeedbackDisplayProps> = ({
  sessionId,
  compact = false,
  maxItems = 10,
}) => {
  const narrativeFeedbacks = useRecoilValue(narrativeFeedbacksAtom);

  // セッションIDでフィルタリング（指定された場合）
  const filteredFeedbacks = useMemo(() => {
    let feedbacks = narrativeFeedbacks;
    
    if (sessionId) {
      feedbacks = feedbacks.filter(feedback => feedback.sessionId === sessionId);
    }
    
    return feedbacks.slice(0, maxItems);
  }, [narrativeFeedbacks, sessionId, maxItems]);

  const getToneIcon = (tone: NarrativeFeedback['mainNarrative']['tone']) => {
    switch (tone) {
      case 'dramatic': return <TheaterComedyRounded />;
      case 'triumphant': return <EmojiEventsRounded />;
      case 'mysterious': return <HelpRounded />;
      case 'contemplative': return <PsychologyRounded />;
      case 'tense': return <FlashOnRounded />;
      default: return <AutoStoriesRounded />;
    }
  };

  const getToneColor = (tone: NarrativeFeedback['mainNarrative']['tone']) => {
    switch (tone) {
      case 'dramatic': return '#e91e63'; // pink
      case 'triumphant': return '#ff9800'; // orange
      case 'mysterious': return '#9c27b0'; // purple
      case 'contemplative': return '#3f51b5'; // indigo
      case 'tense': return '#f44336'; // red
      default: return '#2196f3'; // blue
    }
  };

  const getWeightLabel = (weight: NarrativeFeedback['narrativeWeight']) => {
    switch (weight) {
      case 'minor': return '小さな変化';
      case 'significant': return '重要な進展';
      case 'major': return '大きな転換';
      case 'pivotal': return '運命的瞬間';
      default: return weight;
    }
  };

  const getWeightColor = (weight: NarrativeFeedback['narrativeWeight']) => {
    switch (weight) {
      case 'minor': return 'default';
      case 'significant': return 'primary';
      case 'major': return 'warning';
      case 'pivotal': return 'error';
      default: return 'default';
    }
  };

  if (filteredFeedbacks.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
        <AutoStoriesRounded sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          まだ物語のフィードバックはありません
        </Typography>
      </Paper>
    );
  }

  if (compact) {
    return (
      <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
        <Stack spacing={1} sx={{ p: 2 }}>
          {filteredFeedbacks.map((feedback, index) => (
            <Box key={feedback.id}>
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: getToneColor(feedback.mainNarrative.tone),
                    fontSize: '0.8rem',
                  }}
                >
                  {getToneIcon(feedback.mainNarrative.tone)}
                </Avatar>
                
                <Box flexGrow={1}>
                  <Typography variant="caption" fontWeight="bold">
                    {feedback.mainNarrative.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {new Date(feedback.timestamp).toLocaleTimeString('ja-JP')}
                  </Typography>
                </Box>

                <Chip
                  label={getWeightLabel(feedback.narrativeWeight)}
                  size="small"
                  color={getWeightColor(feedback.narrativeWeight)}
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              </Box>
              {index < filteredFeedbacks.length - 1 && <Divider sx={{ mt: 1 }} />}
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {filteredFeedbacks.map((feedback) => (
        <Paper key={feedback.id} sx={{ overflow: 'hidden' }}>
          <Accordion defaultExpanded={feedback.narrativeWeight === 'major' || feedback.narrativeWeight === 'pivotal'}>
            <AccordionSummary
              expandIcon={<ExpandMoreRounded />}
              sx={{
                bgcolor: 'background.default',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Avatar
                  sx={{
                    bgcolor: getToneColor(feedback.mainNarrative.tone),
                    width: 40,
                    height: 40,
                  }}
                >
                  {getToneIcon(feedback.mainNarrative.tone)}
                </Avatar>

                <Box flexGrow={1}>
                  <Typography variant="h6" component="div">
                    {feedback.mainNarrative.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    マイルストーン: {feedback.milestoneName} • {new Date(feedback.timestamp).toLocaleString('ja-JP')}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Chip
                    label={getWeightLabel(feedback.narrativeWeight)}
                    color={getWeightColor(feedback.narrativeWeight)}
                    size="small"
                  />
                  <Tooltip title={`トーン: ${feedback.mainNarrative.tone}`}>
                    <Chip
                      label={feedback.mainNarrative.tone}
                      size="small"
                      sx={{
                        bgcolor: getToneColor(feedback.mainNarrative.tone),
                        color: 'white',
                      }}
                    />
                  </Tooltip>
                  {!feedback.isRead && (
                    <Tooltip title="未読">
                      <IconButton size="small" color="primary">
                        <VisibilityRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Box sx={{ pt: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.7,
                    fontStyle: 'italic',
                    color: 'text.secondary',
                  }}
                >
                  {feedback.mainNarrative.content}
                </Typography>

                {feedback.isDetailedFeedback && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AutoStoriesRounded fontSize="small" />
                      詳細な物語フィードバック
                    </Typography>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      ))}
    </Stack>
  );
};