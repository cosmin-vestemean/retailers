// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app.js'

describe('CCCSFTPXML service', () => {
  it('registered the service', () => {
    const service = app.service('CCCSFTPXML')

    assert.ok(service, 'Registered the service')
  })
})
