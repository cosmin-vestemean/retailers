import { KnexService } from '@feathersjs/knex'

// By default calls the standard Knex adapter service methods but can be customized with your own functionality.
export class CccretailersclientsService extends KnexService {}

export const getOptions = (app) => {
  return {
    id: 'TRDR_CLIENT',
    paginate: app.get('paginate'),
    Model: app.get('mssqlClient'),
    name: 'CCCRETAILERSCLIENTS'
  }
}
