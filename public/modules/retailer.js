/*
<div class="column coumn-is-third">
        <div class="card">
          <div class="card-image">
            <figure class="image is-128x128">
              <img
                style="background-color: #fff"
                src="https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg"
                alt="Placeholder image"
              />
            </figure>
          </div>
          <div class="card-content">
            <div class="content">
              44 comenzii procesate<br />
              43 facturi emise<br />
              Ultimul document procesat: <time datetime="2016-1-1">16 iunie 2023 - 11:09 PM</time>
            </div>
          </div>
          <footer class="card-footer">
            <a href="#" class="card-footer-item">Statistici</a>
            <a href="retailer_file_manager.html?trdr=11639&logo='https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg'" class="card-footer-item eMag">File manager</a>
            <a href="retailer_config.html?trdr=11639&logo='https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg'" class="card-footer-item eMag">Configureaza</a>
          </footer>
        </div>
      </div>
      */

//make a class for retailer so it returns the html
//use the class in the main file

export class Retailer {
  constructor(trdr, logo) {
    this.trdr = trdr
    this.logo = logo
    this.nrOrders = 44
    this.nrInvoices = 43
    this.lastProcessedDocument = '16 iunie 2023 - 11:09 PM'
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
                                src="${this.logo}"
                                alt="Placeholder image"
                            />
                        </figure>
                        </div>
                        <div class="card-content">
                        <div class="content">
                            ${this.nrOrders} comenzii procesate<br />
                            ${this.nrInvoices} facturi emise<br />
                            Ultimul document procesat: <time datetime="2016-1-1">${this.lastProcessedDocument}</time>
                        </div>
                        </div>
                        <footer class="card-footer">
                        <a href="#" class="card-footer-item">Statistici</a>
                        <a href="retailer_file_manager.html?trdr=${this.trdr}&logo='${this.logo}'" class="card-footer-item eMag">File manager</a>
                        <a href="retailer_config.html?trdr=${this.trdr}&logo='${this.logo}'" class="card-footer-item eMag">Configureaza</a>
                        </footer>
                        </div>
                        </div>
                        `
  }
}
