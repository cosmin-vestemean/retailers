import { GetS1ObjDataService, getOptions } from './get-s1-obj-data.class.js'

export const getS1ObjDataPath = 'getS1ObjData'
export const getS1ObjDataMethods = ['find']

export const getS1ObjData = (app) => {
  app.use(getS1ObjDataPath, new GetS1ObjDataService(getOptions(app)), {
    methods: getS1ObjDataMethods,
    events: []
  })
}