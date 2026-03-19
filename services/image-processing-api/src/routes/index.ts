import express from 'express';
import images from './api/images';
const routes = express.Router();
import { Request, Response } from 'express';

routes.get('/', (req: Request, res: Response) => {
  res.send('this is the main route ');
});

routes.use('/api', images);

export default routes;
