import { GetDatasetService, getOptions } from './get-dataset.class.js'

export const getDatasetPath = 'getDataset'
export const getDatasetMethods = ['find']

export const getDataset = (app) => {
  app.use(getDatasetPath, new GetDatasetService(getOptions(app)), {
    methods: getDatasetMethods,
    events: []
  })
}