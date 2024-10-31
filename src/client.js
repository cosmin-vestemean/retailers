// For more information about this file see https://dove.feathersjs.com/guides/cli/client.html
import { feathers } from '@feathersjs/feathers'
import authenticationClient from '@feathersjs/authentication-client'
import { cccorderslogClient } from './services/CCCORDERSLOG/CCCORDERSLOG.shared.js'

import { cccaperakClient } from './services/CCCAPERAK/CCCAPERAK.shared.js'

import { cccaperakClient } from './services/CCCAPERAK/CCCAPERAK.shared.js'

import { cccretailersclientsClient } from './services/CCCRETAILERSCLIENTS/CCCRETAILERSCLIENTS.shared.js'

import { cccxmls1MappingsClient } from './services/CCCXMLS1MAPPINGS/CCCXMLS1MAPPINGS.shared.js'

import { cccdocumentes1MappingsClient } from './services/CCCDOCUMENTES1MAPPINGS/CCCDOCUMENTES1MAPPINGS.shared.js'

import { cccsftpxmlClient } from './services/CCCSFTPXML/CCCSFTPXML.shared.js'

import { cccsftpClient } from './services/CCCSFTP/CCCSFTP.shared.js'

/**
 * Returns a  client for the retailers app.
 *
 * @param connection The REST or Socket.io Feathers client connection
 * @param authenticationOptions Additional settings for the authentication client
 * @see https://dove.feathersjs.com/api/client.html
 * @returns The Feathers client application
 */
export const createClient = (connection, authenticationOptions = {}) => {
  const client = feathers()

  client.configure(connection)
  client.configure(authenticationClient(authenticationOptions))
  client.set('connection', connection)

  client.configure(cccsftpClient)

  client.configure(cccsftpxmlClient)

  client.configure(cccdocumentes1MappingsClient)

  client.configure(cccxmls1MappingsClient)

  client.configure(cccretailersclientsClient)

  client.configure(cccaperakClient)

  client.configure(cccaperakClient)

  client.configure(cccorderslogClient)

  return client
}
