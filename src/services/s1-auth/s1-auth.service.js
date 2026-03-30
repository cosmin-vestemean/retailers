import { S1AuthService, getOptions } from './s1-auth.class.js'

export const s1AuthPath = 's1-auth'
export const s1AuthMethods = ['create']

export const s1Auth = (app) => {
  app.use(s1AuthPath, new S1AuthService(getOptions(app)), {
    methods: s1AuthMethods,
    events: []
  })
}
