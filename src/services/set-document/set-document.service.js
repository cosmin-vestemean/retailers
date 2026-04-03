import { SetDocumentService, getOptions } from './set-document.class.js'

export const setDocumentPath = 'setDocument'
export const setDocumentMethods = ['create']

export const setDocument = (app) => {
  app.use(setDocumentPath, new SetDocumentService(getOptions(app)), {
    methods: setDocumentMethods,
    events: []
  })
}