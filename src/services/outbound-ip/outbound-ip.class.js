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
      
      // Also get the Fixie SOCKS proxy IP from environment variables, if available.
      const fixieIp = process.env.FIXIE_SOCKS_HOST || 'Not configured';

      return { ip: data.ip, fixieIp: fixieIp.split(',')[0] }; // Return the first IP if there's a list
    } catch (error) {
      console.error('Failed to get outbound IP:', error);
      return { ip: `Error: ${error.message}`, fixieIp: 'Error' };
    }
  }
}

export const getOptions = (app) => {
  return { app };
};
