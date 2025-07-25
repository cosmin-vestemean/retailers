import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class OutboundIpService {
  constructor(options) {
    this.options = options;
  }

  async find(params) {
    const fixieUrl = process.env.FIXIE_SOCKS_HOST;
    const ipServiceUrl = 'https://api.ipify.org?format=json';

    try {
      // 1. Get the standard outbound IP (no proxy)
      const standardResponse = await fetch(ipServiceUrl);
      if (!standardResponse.ok) {
        throw new Error(`Error fetching standard IP: ${standardResponse.statusText}`);
      }
      const standardData = await standardResponse.json();
      const standardIp = standardData.ip;

      // 2. Get the outbound IP via Fixie SOCKS proxy
      let fixieProxiedIp = 'Not configured or failed';
      if (fixieUrl) {
        try {
          const agent = new SocksProxyAgent(`socks://${fixieUrl}`);
          const fixieResponse = await fetch(ipServiceUrl, { agent });
          if (!fixieResponse.ok) {
            throw new Error(`Error fetching Fixie IP: ${fixieResponse.statusText}`);
          }
          const fixieData = await fixieResponse.json();
          fixieProxiedIp = fixieData.ip;
        } catch (proxyError) {
          console.error('Failed to get outbound IP via Fixie proxy:', proxyError);
          fixieProxiedIp = `Proxy Error: ${proxyError.message}`;
        }
      }
      
      // 3. Get the configured Fixie IPs from the environment variable
      const configuredFixieIps = process.env.FIXIE_SOCKS_HOST || 'Not configured';

      return { 
        ip: standardIp, 
        configuredFixieIps: configuredFixieIps,
        actualFixieIp: fixieProxiedIp
      };

    } catch (error) {
      console.error('Failed to get outbound IP:', error);
      return { 
        ip: `Error: ${error.message}`, 
        configuredFixieIps: 'Error',
        actualFixieIp: 'Error' 
      };
    }
  }
}

export const getOptions = (app) => {
  return { app };
};
