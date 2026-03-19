import supertest from 'supertest';
import { app } from '../index';

const request = supertest(app);

describe('Test endpoint responses', () => {
  it('Should return 200 OK (Image API works)', async () => {
    const response = await request.get(
      '/api/images?filename=icelandwaterfall&height=100&width=500'
    );
    expect(response.status).toBe(200);
  });

  it('Should return 404 Not Found (Image Not Found)', async () => {
    const response = await request.get('/api/images?filename=0&height=100&width=500');
    expect(response.status).toBe(404);
    expect(response.text).toEqual('Image not found');
  });

  it('Should return bad request when width is missing', async () => {
    const response = await request.get(
      '/api/images?filename=icelandwaterfall&height=100'
    );
    expect(response.status).toBe(400);
    expect(response.text).toEqual('Please provide positive numerical values for width and height');
  });

  it('Should return bad request when height is invalid', async () => {
    const response = await request.get(
      '/api/images?filename=icelandwaterfall&height=0&width=500'
    );
    expect(response.status).toBe(400);
    expect(response.text).toEqual('Please provide positive numerical values for width and height');
  });
});
