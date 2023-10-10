import { KnexService } from '@feathersjs/knex'

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class CccsftpService extends KnexService {}

export const getOptions = (app) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mssqlClient'),
    name: 'CCCSFTP',
    id: 'TRDR_RETAILER'
  }
}
