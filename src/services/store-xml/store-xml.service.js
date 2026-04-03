import { StoreXmlService, getOptions } from './store-xml.class.js'

export const storeXmlPath = 'storeXml'
export const storeXmlMethods = ['create']

export const storeXml = (app) => {
  app.use(storeXmlPath, new StoreXmlService(getOptions(app)), {
    methods: storeXmlMethods,
    events: []
  })
}