import { BaseHandler } from '../base-handler';
import { PDFViewer } from './viewer';

export class PDFHandler extends BaseHandler {
  constructor() {
    super();
    this.viewer = null;
  }

  canHandle(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  createViewer(file, container) {
    this.viewer = new PDFViewer(container);
    return this.viewer.load(file);
  }

  destroyViewer() {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
} 