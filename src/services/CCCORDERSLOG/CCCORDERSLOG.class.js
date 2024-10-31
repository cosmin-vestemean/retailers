import { KnexService } from '@feathersjs/knex'

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class CccorderslogService extends KnexService {}

export const getOptions = (app) => {
  return {
    id: 'CCCORDERSLOG',
    paginate: app.get('paginate'),
    Model: app.get('mssqlClient'),
    name: 'CCCORDERSLOG'
  }
}
