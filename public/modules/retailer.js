import client from './feathersjs-client.js'

//make a class for retailer so it returns the html
//use the class in the main file

export class Retailer {
  #trdr
  #logo
  #nrFacturiDeTrimis
  #nrComenziDeTrimis
  #utlimulDocumentProcesat
  constructor(trdr, logo) {
    this.#trdr = trdr
    this.#logo = logo
    this.#nrFacturiDeTrimis = 0
    this.#nrComenziDeTrimis = 0
    this.#utlimulDocumentProcesat = '16 iunie 2023 - 11:09 PM'
  }

  async setNrComenziDeTrimis() {
    let res = 0
    let params = {}
    params['query'] = {}
    params['query']['sqlQuery'] = `SELECT COUNT(*) nrComenziDeTrimis FROM CCCSFTPXML WHERE TRDR_RETAILER = ${
      this.#trdr
    } AND COALESCE(FINDOC, 0) = 0 and year(XMLDATE) = year(getdate())`
    let responseObj1 = await client.service('getDataset').find(params)
    if (responseObj1.data) {
      res = responseObj1.data || 0
    } else {
      res = 0
    }

    this.#nrComenziDeTrimis = res
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
    } AND m.CCCXMLSendDate is null and f.fiscprd=year(getdate()) and f.iscancel=0`
    let responseObj1 = await client.service('getDataset').find(params)
    if (responseObj1.data) {
      res = responseObj1.data || 0
    } else {
      res = 0
    }

    this.#nrFacturiDeTrimis = res
  }

  //class method: getHtml
  getCardHtml() {
    return `
                <div class="column coumn-is-third">
                <div class="card">
                    <div class="card-image">
                        <figure class="image is-128x128">
                            <img
                                style="background-color: #fff"
                                src="${this.#logo}"
                                alt="Placeholder image"
                            />
                        </figure>
                        </div>
                        <div class="card-content">
                        <div class="content"><section>
                            ${
                              this.#nrComenziDeTrimis > 0
                                ? '<span class="tag is-danger">' +
                                  this.#nrComenziDeTrimis +
                                  ' comenzi de trimis</span>'
                                : '<span class="tag is-success">Nu sunt comenzi de trimis</span>'
                            }</section><section>
                            ${
                              this.#nrFacturiDeTrimis > 0
                                ? '<span class="tag is-danger">' +
                                  this.#nrFacturiDeTrimis +
                                  ' facturi de trimis</span>'
                                : '<span class="tag is-success">Nu sunt facturi de trimis</span>'
                            }</section>
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
                        </div>
                        `
  }
}
