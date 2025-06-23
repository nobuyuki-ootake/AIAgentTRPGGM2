import { Router } from 'express';
import { TRPGCampaign, APIResponse, PaginatedResponse } from '@ai-agent-trpg/types';
import { getCampaignService } from '../services/campaignService';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';

export const campaignRouter = Router();

// キャンペーン一覧取得
campaignRouter.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const campaigns = await getCampaignService().getCampaigns({
    page,
    limit,
    status,
    search,
  });

  const response: APIResponse<PaginatedResponse<TRPGCampaign>> = {
    success: true,
    data: campaigns,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャンペーン詳細取得
campaignRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('Campaign ID is required');
  }

  const campaign = await getCampaignService().getCampaignById(id);

  if (!campaign) {
    throw new NotFoundError('Campaign', id);
  }

  const response: APIResponse<TRPGCampaign> = {
    success: true,
    data: campaign,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャンペーン作成
campaignRouter.post('/', asyncHandler(async (req, res) => {
  const campaignData = req.body;

  if (!campaignData.name || !campaignData.settings) {
    throw new ValidationError('Campaign name and settings are required');
  }

  const campaign = await getCampaignService().createCampaign(campaignData);

  const response: APIResponse<TRPGCampaign> = {
    success: true,
    data: campaign,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json(response);
}));

// キャンペーン更新
campaignRouter.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    throw new ValidationError('Campaign ID is required');
  }

  const campaign = await getCampaignService().updateCampaign(id, updateData);

  if (!campaign) {
    throw new NotFoundError('Campaign', id);
  }

  const response: APIResponse<TRPGCampaign> = {
    success: true,
    data: campaign,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャンペーン削除
campaignRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('Campaign ID is required');
  }

  const deleted = await getCampaignService().deleteCampaign(id);

  if (!deleted) {
    throw new NotFoundError('Campaign', id);
  }

  const response: APIResponse<null> = {
    success: true,
    data: null,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));

// キャンペーンステータス更新
campaignRouter.patch('/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !status) {
    throw new ValidationError('Campaign ID and status are required');
  }

  const campaign = await getCampaignService().updateCampaignStatus(id, status);

  if (!campaign) {
    throw new NotFoundError('Campaign', id);
  }

  const response: APIResponse<TRPGCampaign> = {
    success: true,
    data: campaign,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
}));