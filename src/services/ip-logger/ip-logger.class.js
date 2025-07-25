// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import { feathers } from '@feathersjs/feathers'

export class IpLoggerService {
  constructor (options) {
    this.options = options
  }

  async find(params) {
    // The `params.connection` object is available for Socket.io transports
    if (!params.connection) {
      return {
        ip: 'IP not available (likely an internal server call)'
      };
    }
    
    // Get the underlying request object from the socket connection
    const req = params.connection;
    
    // Extract the IP address. 
    // 'x-forwarded-for' is crucial for apps behind a proxy (like on Heroku).
    const ip = req.headers['x-forwarded-for'] || req.remoteAddress;
    
    return {
      ip: ip || 'IP could not be determined'
    };
  }
}

export const getOptions = (app) => {
  return { app }
}
