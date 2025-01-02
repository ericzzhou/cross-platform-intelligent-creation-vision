import { BaseHandler } from '../base-handler';
import { ListView } from './viewer';

export class ListHandler extends BaseHandler {
  constructor() {
    super();
    this.viewer = null;
  }

  canHandle(files) {
    return Array.isArray(files) && files.length > 0;
  }

  createViewer(files, container) {
    this.viewer = new ListView(container);
    return this.viewer.load(files);
  }

  destroyViewer() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
} 