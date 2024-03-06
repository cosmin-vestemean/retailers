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
    } AND COALESCE(FINDOC, 0) = 0`
    let responseObj1 = await client.service('getDataset').find(params)
    console.log('responseObj1', responseObj1)
    if (responseObj1.data) {
      res = responseObj1.data || 0
    } else {
      res = 0
    }

    this.#nrComenziDeTrimis = res
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
                        <div class="content">
                            ${this.#nrFacturiDeTrimis} facturi de trimis<br />
                            ${
                              this.#nrComenziDeTrimis > 0
                                ? '<span class="tag is-danger">' +
                                  this.#nrComenziDeTrimis +
                                  ' comenzi de trimis'
                                : 'Nu sunt comenzi de trimis'
                            }
                            Ultimul document procesat: <time datetime="2016-1-1">${
                              this.#utlimulDocumentProcesat
                            }</time>
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
