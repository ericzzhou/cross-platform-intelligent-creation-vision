const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class VideoHandler {
  constructor(instanceId) {
    this.instanceId = instanceId;
    this.setupIPC();
  }

  setupIPC() {
    // 加载视频文件
    ipcMain.handle(`video:load:${this.instanceId}`, async (event, filePath) => {
      try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          throw new Error('文件不存在');
        }

        // 读取文件
        const buffer = await fs.promises.readFile(filePath);
        
        // 转换为 base64
        const data = `data:video/${path.extname(filePath).slice(1)};base64,${buffer.toString('base64')}`;
        
        return {
          data,
          name: path.basename(filePath)
        };
      } catch (err) {
        console.error('Failed to load video:', err);
        throw err;
      }
    });

    // 保存视频截图
    ipcMain.handle(`video:screenshot:${this.instanceId}`, async (event, { data, name }) => {
      try {
        const buffer = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const savePath = path.join(process.env.USERPROFILE, 'Pictures', `${name}.png`);
        
        await fs.promises.writeFile(savePath, buffer);
        return savePath;
      } catch (err) {
        console.error('Failed to save screenshot:', err);
        throw err;
      }
    });
  }

  cleanup() {
    // 清理 IPC 监听器
    ipcMain.removeHandler(`video:load:${this.instanceId}`);
    ipcMain.removeHandler(`video:screenshot:${this.instanceId}`);
  }
}

module.exports = VideoHandler; 