import { S1UsersService, getOptions } from './s1-users.class.js'

export const s1UsersPath = 's1-users'
export const s1UsersMethods = ['find']

export const s1Users = (app) => {
  app.use(s1UsersPath, new S1UsersService(getOptions(app)), {
    methods: s1UsersMethods,
    events: []
  })
}
