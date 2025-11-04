import type { Request, Response } from 'express';
import type { SetaApiService } from '../services/SetaApiService';

export class BusController {
  constructor(private setaApiService: SetaApiService) {}

  public getArrivals = async (req: Request, res: Response): Promise<void> => {
    const { stopId } = req.params;
    if (stopId === 'test') {
      res.json({ message: 'Test successful' });
      return;
    }
    const arrivalsData = await this.setaApiService.fetchArrivals(stopId);
    res.json(arrivalsData);
  };

  public getBusesInService = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const buses = await this.setaApiService.fetchBusesInService();
    res.json(buses);
  };
}
