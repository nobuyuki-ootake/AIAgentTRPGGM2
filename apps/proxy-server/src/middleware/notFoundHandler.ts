import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '@ai-agent-trpg/types';

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const response: APIResponse<null> = {
    success: false,
    error: `Endpoint ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}