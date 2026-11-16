import { Request } from 'express';

const getParam = (req: Request, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : (value ?? '');
};

export const getParamId = (req: Request): string => getParam(req, 'id');

export const getRouteParam = (req: Request, key: string): string =>
  getParam(req, key);
