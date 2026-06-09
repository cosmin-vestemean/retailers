import { DoStorageService, getOptions } from './do-storage.class.js'

export const doStoragePath = 'do-storage'
export const doStorageMethods = [
  'status',
  'list',
  'get',
  'retry',
  'retryPeriodically',
  'stopRetry',
  'remove',
  'backupXml',
  'saveRetryXml',
  'moveToRetry',
  'deleteSuccess'
]

export const doStorage = (app) => {
  app.use(doStoragePath, new DoStorageService(getOptions(app)), {
    methods: doStorageMethods,
    events: []
  })
}