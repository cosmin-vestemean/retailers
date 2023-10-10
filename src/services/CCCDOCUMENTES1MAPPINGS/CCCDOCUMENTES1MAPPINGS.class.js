import { KnexService } from '@feathersjs/knex'

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class Cccdocumentes1MappingsService extends KnexService {}

export const getOptions = (app) => {
  return {
    id: 'CCCDOCUMENTES1MAPPINGS',
    paginate: app.get('paginate'),
    Model: app.get('mssqlClient'),
    name: 'CCCDOCUMENTES1MAPPINGS'
  }
}
