// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import { feathers } from '@feathersjs/feathers'

export class IpLoggerService {
  constructor (options) {
    this.options = options
  }

  async find(params) {
    // Get the request object from the parameters
    const { req } = params.connection;
    
    // Extract the IP address. 
    // 'x-forwarded-for' is important for proxies like Heroku.
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    
    return {
      ip: ip
    };
  }
}

export const getOptions = (app) => {
  return { app }
}
