import { Retailer } from './modules/retailer.js'

// Create an array of Retailer objects
export const retailers = [
  new Retailer('11639', 'https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg', 'eMAG'),
  new Retailer('12349', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Kaufland_201x_logo.svg', 'Kaufland'),
  new Retailer('13249', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Cora_logo.svg', 'Cora'),
  new Retailer('78631', 'https://www.supeco.ro/wp-content/uploads/2018/07/Asset-1.svg', 'Supeco'),
  new Retailer(
    '11322',
    'https://cdn-static.carrefour.ro/unified/assets/images/dist/logo/default/carrefour.png', 'Carrefour'
  ),
  new Retailer('11920', 'https://upload.wikimedia.org/wikipedia/commons/5/53/Logo_METRO.svg', 'Metro', true),
  new Retailer('38804', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Logo_PROFI_nou_OK.png/1200px-Logo_PROFI_nou_OK.png', 'Profi', true),
  new Retailer('11654', 'https://cdn.dedeman.ro/static/version1718221031/frontend/Dedeman/white/ro_RO/images/logo.svg', 'Dedeman'),
]

export async function drawRetailers() {
  // Generate the HTML for each card and add it to the DOM
  for (var i = 0; i < retailers.length; i = i + 3) {
    const row = document.createElement('div')
    row.className = 'columns'
    //add row to cardsContainer
    document.getElementById('cardsContainer').appendChild(row)
    for (var j = i; j < i + 3; j++) {
      if (j < retailers.length) {
        const retailer = retailers[j]
        const card = retailer.getCardHtml()
        row.innerHTML += card

        // Call async methods after the card is displayed
        retailer.updateDataAsync()
      }
    }
  }
}
