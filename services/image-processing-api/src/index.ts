import express from 'express';
import routes from './routes/index';
const app = express();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const getPort = (): number => port;

app.use('/', routes);

app.listen(port, () => console.log(`server running on port ${port}`));

export { app, getPort };
