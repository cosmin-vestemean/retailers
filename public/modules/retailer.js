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
    this.#nrComenziDeTrimis = client.service('getDataset').find({
      sqlQuery: `SELECT COUNT(*) FROM CCCSFTPXML WHERE TRDR_RETAILER = ${trdr} AND COALESCE(FINDOC, 0) = 0`
    })
    this.#utlimulDocumentProcesat = '16 iunie 2023 - 11:09 PM'
  }

  setNrComenziDeTrimis(nrComenziDeTrimis) {
    this.#nrComenziDeTrimis = nrComenziDeTrimis
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
                            ${this.#nrComenziDeTrimis} comenzi de trimis<br />
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
