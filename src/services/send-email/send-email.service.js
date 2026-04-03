import { SendEmailService, getOptions } from './send-email.class.js'

export const sendEmailPath = 'sendEmail'
export const sendEmailMethods = ['create']

export const sendEmail = (app) => {
  app.use(sendEmailPath, new SendEmailService(getOptions(app)), {
    methods: sendEmailMethods,
    events: []
  })
}