import { Router } from 'express';
import { TRPGEvent, APIResponse, PaginatedResponse } from '@ai-agent-trpg/types';
import { eventService } from '../services/eventService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const eventRouter = Router();

// イベント一覧取得
eventRouter.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const campaignId = req.query.campaignId as string;
  const type = req.query.type as string;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const events = await eventService.getEvents({
    page,
    limit,
    campaignId,
    type,
    status,
    search,
  });

  const response: APIResponse<PaginatedResponse<TRPGEvent>> = {
    success: true,
    data: events,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャンペーン別イベント取得
eventRouter.get('/campaign/:campaignId', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;

  if (!campaignId) {
    throw new ValidationError('Campaign ID is required');
  }

  const events = await eventService.getEventsByCampaign(campaignId);

  const response: APIResponse<TRPGEvent[]> = {
    success: true,
    data: events,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// イベント詳細取得
eventRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('Event ID is required');
  }

  const event = await eventService.getEventById(id);

  if (!event) {
    throw new NotFoundError('Event', id);
  }

  const response: APIResponse<TRPGEvent> = {
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// イベント作成
eventRouter.post('/', asyncHandler(async (req, res) => {
  const eventData = req.body;

  if (!eventData.title || !eventData.description || !eventData.type || !eventData.campaignId) {
    throw new ValidationError('Title, description, type, and campaign ID are required');
  }

  if (!eventData.scheduledDate) {
    throw new ValidationError('Scheduled date is required');
  }

  const event = await eventService.createEvent(eventData);

  const response: APIResponse<TRPGEvent> = {
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

// イベント更新
eventRouter.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    throw new ValidationError('Event ID is required');
  }

  const event = await eventService.updateEvent(id, updateData);

  if (!event) {
    throw new NotFoundError('Event', id);
  }

  const response: APIResponse<TRPGEvent> = {
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// イベント削除
eventRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('Event ID is required');
  }

  const deleted = await eventService.deleteEvent(id);

  if (!deleted) {
    throw new NotFoundError('Event', id);
  }

  const response: APIResponse<null> = {
    success: true,
    data: null,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// イベント開始
eventRouter.post('/:id/start', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('Event ID is required');
  }

  const event = await eventService.startEvent(id);

  if (!event) {
    throw new NotFoundError('Event', id);
  }

  const response: APIResponse<TRPGEvent> = {
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// イベント完了
eventRouter.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { outcomes } = req.body;

  if (!id) {
    throw new ValidationError('Event ID is required');
  }

  if (!outcomes) {
    throw new ValidationError('Event outcomes are required');
  }

  const event = await eventService.completeEvent(id, outcomes);

  if (!event) {
    throw new NotFoundError('Event', id);
  }

  const response: APIResponse<TRPGEvent> = {
    success: true,
    data: event,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));