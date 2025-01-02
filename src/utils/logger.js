const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      const userData = app.getPath('userData');
      this.logPath = path.join(userData, 'logs');
      
      if (!fs.existsSync(this.logPath)) {
        fs.mkdirSync(this.logPath, { recursive: true });
      }
      
      this.logFile = path.join(this.logPath, `app-${new Date().toISOString().split('T')[0]}.log`);
      
      this.writeLog('INFO', 'Logger initialized');
    } catch (error) {
      console.error('Logger initialization failed:', error);
    }
  }

  writeLog(level, message, ...args) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      logMessage += ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');
    }

    console.log(logMessage);
    
    try {
      if (this.logFile) {
        //fs.appendFileSync(this.logFile, logMessage + '\n');
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  debug(message, ...args) {
    this.writeLog('DEBUG', message, ...args);
  }

  info(message, ...args) {
    this.writeLog('INFO', message, ...args);
  }

  warn(message, ...args) {
    this.writeLog('WARN', message, ...args);
  }

  error(message, ...args) {
    this.writeLog('ERROR', message, ...args);
  }
}

module.exports = new Logger(); 