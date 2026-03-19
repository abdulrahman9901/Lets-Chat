import { serveImage } from "../utilities";
import { promises as fsPromises } from 'fs';

describe('serveImage tests ', () => {
    it('should return the image "icelandwaterfall" from assets/full ', async () => {
      const { buffer } = await serveImage({ filename: "icelandwaterfall" });
      expect(buffer).toEqual(await fsPromises.readFile(`./assets/full/icelandwaterfall.jpg`));
    });
  });
  