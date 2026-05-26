import { Request, Response } from 'express';
import { PincodeService } from '../services/pincode.service';
import { asyncHandler } from '../utils/asyncHandler';
import { getRouteParam } from '../utils/params';
import { ApiResponse } from '../views/ApiResponse';

export class PincodeController {
  static lookup = asyncHandler(async (req: Request, res: Response) => {
    const result = await PincodeService.lookup(getRouteParam(req, 'pin'));
    ApiResponse.success(res, result, 'PIN lookup successful');
  });
}
