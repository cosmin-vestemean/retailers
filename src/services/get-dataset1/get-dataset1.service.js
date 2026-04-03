import { GetDataset1Service, getOptions } from './get-dataset1.class.js'

export const getDataset1Path = 'getDataset1'
export const getDataset1Methods = ['find']

export const getDataset1 = (app) => {
  app.use(getDataset1Path, new GetDataset1Service(getOptions(app)), {
    methods: getDataset1Methods,
    events: []
  })
}