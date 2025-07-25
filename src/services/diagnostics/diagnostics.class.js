import { SocksProxyAgent } from 'socks-proxy-agent';
import axios from 'axios';

export class DiagnosticsService {
  constructor(options) {
    this.options = options || {};
  }

  async find(params) {
    try {
      const results = {};
      
      // 1. Get standard outbound IP (without proxy)
      try {
        console.log('🔍 Getting standard Heroku outbound IP...');
        const standardResponse = await axios.get('https://api.ipify.org?format=json', {
          timeout: 10000
        });
        results.standardIp = standardResponse.data.ip;
        console.log(`📍 Standard IP: ${results.standardIp}`);
      } catch (error) {
        console.error('❌ Failed to get standard IP:', error.message);
        results.standardIp = 'Error: ' + error.message;
      }

      // 2. Get Fixie SOCKS proxy IP
      try {
        console.log('🔍 Getting Fixie SOCKS proxy outbound IP...');
        
        // Use Fixie SOCKS proxy configuration
        const fixieUrl = process.env.FIXIE_SOCKS_HOST;
        if (!fixieUrl) {
          throw new Error('FIXIE_SOCKS_HOST environment variable not found');
        }

        const agent = new SocksProxyAgent(fixieUrl);
        const fixieResponse = await axios.get('https://api.ipify.org?format=json', {
          httpsAgent: agent,
          httpAgent: agent,
          timeout: 15000
        });
        results.fixieIp = fixieResponse.data.ip;
        console.log(`📍 Fixie SOCKS IP: ${results.fixieIp}`);
      } catch (error) {
        console.error('❌ Failed to get Fixie SOCKS IP:', error.message);
        results.fixieIp = 'Error: ' + error.message;
      }

      // 3. Additional diagnostic info
      results.timestamp = new Date().toISOString();
      results.environment = {
        nodeEnv: process.env.NODE_ENV,
        hasFixieHost: !!process.env.FIXIE_SOCKS_HOST,
        fixieHostPreview: process.env.FIXIE_SOCKS_HOST ? 
          process.env.FIXIE_SOCKS_HOST.substring(0, 20) + '...' : 'Not set'
      };

      console.log('✅ Diagnostics completed:', results);
      return results;

    } catch (error) {
      console.error('❌ Diagnostics service error:', error);
      throw error;
    }
  }
}
