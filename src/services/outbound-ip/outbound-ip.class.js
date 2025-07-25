import fetch from 'node-fetch';

export class OutboundIpService {
  constructor(options) {
    this.options = options;
  }

  async find(params) {
    try {
      // Use a public API to find out the server's outbound IP address.
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error(`Error fetching IP: ${response.statusText}`);
      }
      const data = await response.json();
      return { ip: data.ip };
    } catch (error) {
      console.error('Failed to get outbound IP:', error);
      return { ip: `Error: ${error.message}` };
    }
  }
}

export const getOptions = (app) => {
  return { app };
};
