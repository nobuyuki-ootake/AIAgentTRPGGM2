import { useState, useEffect, useCallback } from 'react';
import { TRPGEvent } from '@ai-agent-trpg/types';
import { eventAPI } from '@/api';
import { useNotification } from '@/components/common/NotificationProvider';

export interface UseSessionEventsOptions {
  sessionId?: string;
  campaignId: string;
}

export const useSessionEvents = ({ campaignId }: UseSessionEventsOptions) => {
  // sessionIdは今のところ使用していない
  const [events, setEvents] = useState<TRPGEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<TRPGEvent | null>(null);
  const [eventQueue, setEventQueue] = useState<TRPGEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { showSuccess, showInfo, showError } = useNotification();

  // Load all campaign events
  useEffect(() => {
    if (campaignId) {
      loadCampaignEvents();
    }
  }, [campaignId]);

  const loadCampaignEvents = async () => {
    try {
      setLoading(true);
      const campaignEvents = await eventAPI.getEventsByCampaign(campaignId);
      setEvents(campaignEvents);
      
      // Initialize event queue with pending events
      const pendingEvents = campaignEvents.filter(e => !e.actualStartTime && !e.completedAt);
      setEventQueue(pendingEvents);
    } catch (error) {
      console.error('Failed to load campaign events:', error);
      showError('イベントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Start an event (trigger during session)
  const triggerEvent = useCallback(async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) {
        showError('イベントが見つかりません');
        return null;
      }

      // Start the event
      const startedEvent = await eventAPI.startEvent(eventId);
      
      // Update local state
      setEvents(prev => prev.map(e => e.id === eventId ? startedEvent : e));
      setCurrentEvent(startedEvent);
      setEventQueue(prev => prev.filter(e => e.id !== eventId));
      
      showInfo(`イベント「${startedEvent.title}」が開始されました！`);
      return startedEvent;
    } catch (error) {
      console.error('Failed to trigger event:', error);
      showError('イベントの開始に失敗しました');
      return null;
    }
  }, [events, showInfo, showError]);

  // Complete an event
  const completeCurrentEvent = useCallback(async (outcomes?: TRPGEvent['outcomes']) => {
    if (!currentEvent) return null;

    try {
      const defaultOutcomes = {
        success: true,
        experience: 50,
        rewards: ['セッション参加経験値'],
        consequences: [],
        storyImpact: ['セッション中にイベントが完了しました'],
      };

      const completedEvent = await eventAPI.completeEvent(
        currentEvent.id, 
        outcomes || defaultOutcomes,
      );
      
      // Update local state
      setEvents(prev => prev.map(e => e.id === currentEvent.id ? completedEvent : e));
      setCurrentEvent(null);
      
      showSuccess(`イベント「${completedEvent.title}」が完了しました！`);
      return completedEvent;
    } catch (error) {
      console.error('Failed to complete event:', error);
      showError('イベントの完了に失敗しました');
      return null;
    }
  }, [currentEvent, showSuccess, showError]);

  // Get suggested events for current session context
  const getSuggestedEvents = useCallback((sessionMode: 'exploration' | 'combat' | 'social' | 'planning') => {
    const modeToEventType: Record<string, string[]> = {
      exploration: ['exploration', 'story', 'puzzle'],
      combat: ['combat', 'story'],
      social: ['social', 'story'],
      planning: ['rest', 'story'],
    };

    const relevantTypes = modeToEventType[sessionMode] || ['story'];
    return eventQueue.filter(event => relevantTypes.includes(event.type));
  }, [eventQueue]);

  // Automatically suggest events based on session context
  const autoSuggestEvent = useCallback(async (sessionMode: 'exploration' | 'combat' | 'social' | 'planning') => {
    const suggestions = getSuggestedEvents(sessionMode);
    
    if (suggestions.length > 0 && !currentEvent) {
      const randomEvent = suggestions[Math.floor(Math.random() * suggestions.length)];
      showInfo(`推奨イベント: ${randomEvent.title} (${randomEvent.type})`);
    }
  }, [getSuggestedEvents, currentEvent, triggerEvent, showInfo]);

  // Create and trigger a quick event during session
  const createQuickEvent = useCallback(async (
    title: string, 
    description: string, 
    type: TRPGEvent['type'] = 'story',
  ) => {
    try {
      const quickEventData = {
        title,
        description,
        type,
        campaignId,
        scheduledDate: new Date().toISOString(),
        duration: 30, // Quick events are short
        location: '現在の場所',
        participants: [], // Will be filled by session
        difficulty: 'medium' as const,
        challengeRating: 1,
      };

      const newEvent = await eventAPI.createEvent(quickEventData);
      const startedEvent = await eventAPI.startEvent(newEvent.id);
      
      setEvents(prev => [...prev, startedEvent]);
      setCurrentEvent(startedEvent);
      
      showSuccess(`クイックイベント「${title}」が開始されました！`);
      return startedEvent;
    } catch (error) {
      console.error('Failed to create quick event:', error);
      showError('クイックイベントの作成に失敗しました');
      return null;
    }
  }, [campaignId, showSuccess, showError]);

  return {
    events,
    currentEvent,
    eventQueue,
    loading,
    actions: {
      triggerEvent,
      completeCurrentEvent,
      getSuggestedEvents,
      autoSuggestEvent,
      createQuickEvent,
      reloadEvents: loadCampaignEvents,
    },
  };
};