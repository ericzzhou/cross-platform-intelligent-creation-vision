import { BaseHandler } from '../base-handler';
import { ImageViewer } from './viewer';
import { CONFIG } from '../../../constants/config';

export class ImageHandler extends BaseHandler {
  constructor() {
    super();
    this.viewer = null;
    this.supportedTypes = CONFIG.supportedTypes.images;
  }

  canHandle(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    return this.supportedTypes.includes(`.${ext}`);
  }

  createViewer(file, container) {
    if (this.viewer) {
      this.destroyViewer();
    }
    this.viewer = new ImageViewer(container);
    return this.viewer.load(file);
  }

  destroyViewer() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
} 