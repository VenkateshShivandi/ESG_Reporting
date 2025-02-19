type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export const log = (level: LogLevel, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  switch (level) {
    case 'info':
      console.log(logMessage);
      break;
    case 'warning':
      console.warn(logMessage);
      break;
    case 'error':
      console.error(logMessage);
      break;
    case 'debug':
      console.debug(logMessage);
      break;
  }

  if (data) {
    console.log('Additional data:', JSON.stringify(data, null, 2));
  }
};