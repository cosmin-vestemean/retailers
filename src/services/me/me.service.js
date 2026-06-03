import { authenticate } from '@feathersjs/authentication'

class MeService {
  async find(params) {
    const user = params?.user || {}
    const exp = params?.authentication?.payload?.exp
    return {
      authenticated: true,
      user: {
        userId: Number(user.userId),
        username: user.username || null,
        name: user.name || ''
      },
      expiresAt: exp ? exp * 1000 : null
    }
  }
}

export const mePath = 'me'

export const me = (app) => {
  app.use(mePath, new MeService(), { methods: ['find'], events: [] })
  app.service(mePath).hooks({
    around: { all: [authenticate('jwt')] }
  })
}