import client from './feathersjs-client.js'

//make a class for retailer so it returns the html
//use the class in the main file

export class Retailer {
  #trdr
  #logo
  #nrFacturiDeTrimis
  #enumFacturiDeTrimis
  #nrComenziDeTrimis
  #name
  #underConstruction

  constructor(trdr, logo, name = '', underConstruction = false) {
    this.#trdr = trdr
    this.#logo = logo
    this.#nrFacturiDeTrimis = 0
    this.#enumFacturiDeTrimis = ''
    this.#nrComenziDeTrimis = 0
    this.#name = name
    this.#underConstruction = underConstruction
  }

  async getName() {
    return this.#name
  }

  async getNrComenziDeTrimis() {
    return this.#nrComenziDeTrimis
  }

  async setNrComenziDeTrimis() {
    let res = 0
    let params = {}
    params['query'] = {}
    //XMLDATE is in format 2023-08-31 11:31:07.000
     //I want to display only last 30 days
    params['query']['sqlQuery'] = `SELECT COUNT(*) nrComenziDeTrimis FROM CCCSFTPXML WHERE TRDR_RETAILER = ${
      this.#trdr
    } AND COALESCE(FINDOC, 0) = 0 and XMLDATE > DATEADD(day, -30, getdate())`

    client
      .service('getDataset')
      .find(params)
      .then((responseObj1) => {
        if (responseObj1.data) {
          res = responseObj1.data || 0
        } else {
          res = 0
        }
        this.#nrComenziDeTrimis = res
        this.updateCardHtml()
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        this.#nrComenziDeTrimis = 0
      })
  }

  async getNrFacturiDeTrimis() {
    return this.#nrFacturiDeTrimis
  }

  async setNrFacturiDeTrimis() {
    //select count(*) nrFacturiDeTrimis  from findoc f inner join mtrdoc m on (f.findoc=m.findoc) where f.sosource=1351 and f.fprms=712 and f.series=7121 and f.trdr=this.#trdr AND m.CCCXMLSendDate is null and f.fiscprd=year(getdate()) and f.iscancel=0
    let res = 0
    let params = {}
    params['query'] = {}
    params['query'][
      'sqlQuery'
    ] = `select count(*) nrFacturiDeTrimis  from findoc f inner join mtrdoc m on (f.findoc=m.findoc) where f.sosource=1351 and f.fprms=712 and f.series=7121 and f.trdr=${
      this.#trdr
    } AND m.CCCXMLSendDate is null and f.iscancel=0 and trndate > DATEADD(day, -30, getdate())`

    await client
      .service('getDataset')
      .find(params)
      .then((responseObj1) => {
        if (responseObj1.data) {
          res = responseObj1.data || 0
        } else {
          res = 0
        }
        this.#nrFacturiDeTrimis = res
        this.updateCardHtml()
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        this.#nrFacturiDeTrimis = 0
      })
  }

  async setEnumFacturiDeTrimis() {
    //getDataset1
    let res = ''
    let params = {}
    params['query'] = {
      sqlQuery: `select fincode, 
      format(trndate, 'dd.MM.yyyy') trndate 
      from findoc f inner join mtrdoc m on (f.findoc=m.findoc) where f.sosource=1351 and f.fprms=712 and f.series=7121 and f.trdr=${
        this.#trdr
      } AND m.CCCXMLSendDate is null and f.iscancel=0 and trndate > DATEADD(day, -30, getdate())`,
    }

    client
      .service('getDataset1')
      .find(params)
      .then((responseObj1) => {
        console.log('responseObj1', responseObj1)
        if (responseObj1.success) {
          //[{fincode:'fac1', trndate: '20240611'}, ...]
          for (let i = 0; i < responseObj1.data.length; i++) {
            let item = responseObj1.data[i]
            res += item.fincode + ' ' + item.trndate + '; '
          }
        } else {
          res = ''
        }
        this.#enumFacturiDeTrimis = res
        this.updateCardHtml()
      })
      .catch((error) => {
        console.error('Error fetching data:', error)
        this.#enumFacturiDeTrimis = ''
      })
  }

  async getTrdr() {
    return this.#trdr
  }

  async getLogo() {
    return this.#logo
  }

  //class method: getHtml
  getCardHtml() {
    const cardId = `card-${this.#trdr}`
    return `
                <div class="column coumn-is-third" id="${cardId}">
                  <div class="card">
                    <div class="card-image">
                        <figure class="image is-128x128">
                            <img
                                src="${this.#logo}"
                                alt="Placeholder image"
                            />
                        </figure>
                    </div>
                    <div class="card-content">
                      <div class="content">
                        ${
                          this.#underConstruction
                            ? '<p class="has-text-danger title is-4">Under construction</p>'
                            : '<p class="title is-4">' + this.#name + '</p>'
                        }
                        <table class="table is-narrow is-small">
                          <tr>
                            <td>Comenzi de trimis:</td><td>
                            ${
                              this.#nrComenziDeTrimis > 0
                                ? '<span class="tag is-danger" data-tooltip="30 zile">' + this.#nrComenziDeTrimis + '</span>'
                                : '<span class="tag is-success">' + this.#nrComenziDeTrimis + '</span>'
                            }</section><section>
                            </td>
                          </tr>
                          <tr>
                            <td>Facturi de trimis:</td><td>
                            ${
                              this.#nrFacturiDeTrimis > 0
                                ? '<span class="tag is-danger is-clickable" data-tooltip="30 zile" onclick="alert(\'' +
                                  this.#enumFacturiDeTrimis +
                                  '\')">' +
                                  this.#nrFacturiDeTrimis +
                                  '</span>'
                                : '<span class="tag is-success">' + this.#nrFacturiDeTrimis + '</span>'
                            }
                            </td>
                          </tr>
                        </table>
                      </div>
                    </div>
                    <footer class="card-footer">
                      <a href="#" class="card-footer-item">Statistici</a>
                      <a href="retailer_file_manager.html?trdr=${this.#trdr}&logo='${
      this.#logo
    }'" class="card-footer-item eMag">File manager</a>
                      <a href="retailer_config.html?trdr=${this.#trdr}&logo='${
      this.#logo
    }'" class="card-footer-item eMag">Configureaza</a>
                    </footer>
                  </div>
                </div>`
  }

  async updateDataAsync() {
    await this.setNrComenziDeTrimis()
    await this.setNrFacturiDeTrimis()
    await this.setEnumFacturiDeTrimis()
    // Optionally, you can update the card's HTML here if needed
  }

  updateCardHtml() {
    const cardId = `card-${this.#trdr}`
    const cardElement = document.getElementById(cardId)
    if (cardElement) {
      cardElement.innerHTML = `
        <div class="card">
          <div class="card-image">
              <figure class="image is-128x128">
                  <img
                      src="${this.#logo}"
                      alt="Placeholder image"
                  />
              </figure>
          </div>
          <div class="card-content">
            <div class="content">
              ${
                this.#underConstruction
                  ? '<p class="has-text-danger title is-4">Under construction</p>'
                  : '<p class="title is-4">' + this.#name + '</p>'
              }
              <table class="table is-narrow is-small">
                <tr>
                  <td>Comenzi de trimis:</td><td>
                  ${
                    this.#nrComenziDeTrimis > 0
                      ? '<span class="tag is-danger">' + this.#nrComenziDeTrimis + '</span>'
                      : '<span class="tag is-success">' + this.#nrComenziDeTrimis + '</span>'
                  }</section><section>
                  </td>
                </tr>
                <tr>
                  <td>Facturi de trimis:</td><td>
                  ${
                    this.#nrFacturiDeTrimis > 0
                      ? '<span class="tag is-danger is-clickable" onclick="alert(\'' +
                        this.#enumFacturiDeTrimis +
                        '\')">' +
                        this.#nrFacturiDeTrimis +
                        '</span>'
                      : '<span class="tag is-success">' + this.#nrFacturiDeTrimis + '</span>'
                  }
                  </td>
                </tr>
              </table>
            </div>
          </div>
          <footer class="card-footer">
            <a href="#" class="card-footer-item">Statistici</a>
            <a href="retailer_file_manager.html?trdr=${this.#trdr}&logo='${
        this.#logo
      }'" class="card-footer-item eMag">File manager</a>
            <a href="retailer_config.html?trdr=${this.#trdr}&logo='${
        this.#logo
      }'" class="card-footer-item eMag">Configureaza</a>
          </footer>
        </div>`
    }
  }
}
