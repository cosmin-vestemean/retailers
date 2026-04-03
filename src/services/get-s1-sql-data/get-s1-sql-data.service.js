import { GetS1SqlDataService, getOptions } from './get-s1-sql-data.class.js'

export const getS1SqlDataPath = 'getS1SqlData'
export const getS1SqlDataMethods = ['find']

export const getS1SqlData = (app) => {
  app.use(getS1SqlDataPath, new GetS1SqlDataService(getOptions(app)), {
    methods: getS1SqlDataMethods,
    events: []
  })
}