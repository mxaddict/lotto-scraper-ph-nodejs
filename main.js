'use strict'

// Load dependencies
const _figlet = require('figlet')
const request = require('request')
const qs = require('querystring')
const { JSDOM } = require('jsdom')
const sqlite = require('sqlite')

// We need an easy way to use the console.log command
let log = console.log
let fig = (string) =>
  log(_figlet.textSync(string.replace(/ /g, '  ')))

// What is the URL for the results page?
let searchUrl = 'http://www.pcso.gov.ph/SearchLottoResult.aspx'
let headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/58.0.3029.81 Chrome/58.0.3029.81 Safari/537.36'
}

fig('LOTTO SCRAPER PH NODEJS')

log('Create our in memory connection')
const dbPromise = sqlite.open(':memory:', { Promise })

log('Loading hidden fields on results page')

// Load the first page so that we can get the hidden field
request.get(
  {
    url: searchUrl,
    headers: headers
  },
  async (err, httpResponse, body) => {
    if (err) {
      fig('Error')
      log(err)
      return
    }

    // Get the database connection
    let db = await dbPromise

    // Run our migrations
    db.migrate({ force: true })

    // Where to save our fields
    let formData = {}

    // Parse the hidden document
    log('Parse the hidden document')
    let hiddenDocument = (new JSDOM(body)).window.document

    // Parse the hidden fields
    log('Parse the hidden fields')
    let fields = hiddenDocument.querySelectorAll('form#mainform input[type=hidden]')

    // Loop the found fields
    for (let i = 0, len = fields.length; i < len; i++) {
      formData[fields[i].name] = fields[i].value
    }

    // Form data for our main request date filter
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartMonth'] = (new Date()).toLocaleString('en-us', { month: 'long' })
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartDate'] = (new Date()).getDate()
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartYear'] = ((new Date()).getFullYear() - 2)
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndMonth'] = (new Date()).toLocaleString('en-us', { month: 'long' })
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndDay'] = (new Date()).getDate()
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndYear'] = (new Date()).getFullYear()
    formData['ctl00$ctl00$cphContainer$cpContent$ddlSelectGame'] = 0
    formData['ctl00$ctl00$cphContainer$cpContent$btnSearch'] = 'Search Lotto'

    // Build the requestBody
    let requestBody = qs.stringify(formData)

    // Load the PSCO results page
    log('Loading results page')
    request.post(
      {
        url: searchUrl,
        body: requestBody,
        headers: {
          'User-Agent': headers['User-Agent'],
          'Content-Length': requestBody.length,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      async (err, httpResponse, body) => {
        if (err) {
          fig('Error')
          log(err)
          return
        }

        // Page loaded, nice
        log('Results page loaded')

        // Parse the document
        log('Parsing the document')
        let document = (new JSDOM(body)).window.document

        // Load the results
        log('Parsing the result rows')
        let results = document.querySelectorAll('#cphContainer_cpContent_GridView1 tr td')
        let resultsCount = results.length / 5

        // Log some debug counts
        log('Found ' + resultsCount + ' results')

        // Loop the results
        for (let i = 0, len = resultsCount; i < len; i++) {
          // Calculate the index
          let x = i * 5

          // Save the result
          let result = {
            game: results[x + 0].innerHTML,
            numbers: results[x + 1].innerHTML.split('-').sort().map(s => { return parseInt(s) }),
            stamp: results[x + 2].innerHTML,
            prize: parseInt(results[x + 3].innerHTML),
            winners: parseInt(results[x + 4].innerHTML)
          }

          // Add to DB
          let res = await db.run(
            'INSERT INTO results ( game, stamp, prize, winners) VALUES ( $game, $stamp, $prize, $winners)',
            {
              $game: result.game,
              $stamp: result.stamp,
              $prize: result.prize,
              $winners: result.winners
            })

          let stmt = await db.prepare('INSERT INTO numbers (result_id, value) VALUES ($result_id, $value)')

          for (let i = 0, len = result.numbers.length; i < len; i++) {
            stmt.run({
              $result_id: res.lastID,
              $value: result.numbers[i]
            })
          }

          stmt.finalize()
        }

        // Query the number of results in database
        let res = await db.get('SELECT COUNT(id) AS count FROM results')

        // We got them all!
        log('Saved ' + res.count + ' results')

        // Query all games
        let games = await db.all('SELECT game FROM results GROUP BY game')

        log(games)

        fig('DONE')
      }
    )
  }
)
