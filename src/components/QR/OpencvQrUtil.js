// OpencvQrUtil.js

import OpencvQr from "opencv-qr";

let instance = null;

class OpencvQrUtil {
  constructor() {
    if (!instance) {
      instance = this;
      this.cvQr = new OpencvQr({
        dw: process.env.BASE_URL + "models/detect.caffemodel",
        sw: process.env.BASE_URL + "models/sr.caffemodel",
      });
    }
    return instance;
  }

  async detectQrCode(canvasId) {
    try {
      const result = await this.cvQr.load(canvasId);
      const infos = result?.getInfos();
      const images = result?.getImages();
      const sizes = result?.getSizes();
      return { infos, images, sizes };
    } catch (error) {
      console.error("Error detecting QR code:", error);
      throw error;
    }
  }
}

export default new OpencvQrUtil();
