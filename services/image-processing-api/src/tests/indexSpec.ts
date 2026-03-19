import { getPort } from '../index';

describe('server tests ', () => {
  it('should return 3000  (Server works)', () => {
    expect(getPort()).toBe(3000);
  });
});
