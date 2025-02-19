export const logger = {
  error: (message: string, error: any) => {
    console.error(message, error);
  },
  info: (message: string) => {
    console.log(message);
  },
};
