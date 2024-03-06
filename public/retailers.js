import { Retailer } from './modules/retailer.js'

// Create an array of Retailer objects
export let retailers = [
  new Retailer('11639', 'https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg'),
  new Retailer('12349', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Kaufland_201x_logo.svg'),
  new Retailer('78631', 'https://www.supeco.ro/wp-content/uploads/2018/07/Asset-1.svg'),
  new Retailer(
    '11322',
    'https://cdn-static.carrefour.ro/unified/assets/images/dist/logo/default/carrefour.png'
  ),
  new Retailer('13249', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Cora_logo.svg'),
  new Retailer('12349', 'https://upload.wikimedia.org/wikipedia/commons/4/44/Kaufland_201x_logo.svg')
]

export function drawRetailers() {
  // Generate the HTML for each card and add it to the DOM
  for (var i = 0; i < retailers.length; i = i + 4) {
    const row = document.createElement('div')
    row.className = 'columns'
    for (var j = i; j < i + 4; j++) {
      if (j < retailers.length) {
        const retailer = retailers[j]
        console.log('retailer', retailer)
        retailer.setNrComenziDeTrimis()
        const card = retailer.getCardHtml()
        row.innerHTML += card
      }
    }
    document.getElementById('cardsContainer').innerHTML += row.outerHTML
  }
}
