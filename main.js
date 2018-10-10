'use strict'

// Load dependencies
const chalk = require('chalk')
const figlet = require('figlet')
const moment = require('moment')
const qs = require('querystring')
const request = require('request')
const sqlite = require('sqlite')
const { JSDOM } = require('jsdom')
const { table } = require('table')

// Load our arguments
const argv = require('yargs')
  .default({
    days: 60,
    split: false
  })
  .argv

// We need an easy way to use the console.log command
let log = console.log
let info = str => {
  log(chalk.green(str))
}
let cyan = str => {
  log(chalk.cyan(str))
}
let err = str => {
  log(chalk.red(str))
}
let fig = str => {
  cyan(figlet.textSync(str.replace(/ /g, '  ')))
}

// What is the URL for the results page?
let searchUrl = 'http://www.pcso.gov.ph/SearchLottoResult.aspx'
let headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/58.0.3029.81 Chrome/58.0.3029.81 Safari/537.36'
}

fig('LOTTO SCRAPER PH NODEJS')

info('Create our in memory connection')
const dbPromise = sqlite.open(':memory:', { Promise })

info('Loading hidden fields on results page')

// Load the first page so that we can get the hidden field
request.get(
  {
    url: searchUrl,
    headers: headers
  },
  async (e, httpResponse, body) => {
    if (e) {
      fig('Error')
      err(e)
      return
    }

    // Get the database connection
    let db = await dbPromise

    // Run our migrations
    db.migrate({ force: true })

    // Where to save our fields
    let formData = {}

    // Parse the hidden document
    info('Parse the hidden document')
    let hiddenDocument = (new JSDOM(body)).window.document

    // Parse the hidden fields
    info('Parse the hidden fields')
    let fields = hiddenDocument.querySelectorAll('form#mainform input[type=hidden]')

    // Loop the found fields
    for (let i = 0, len = fields.length; i < len; i++) {
      formData[fields[i].name] = fields[i].value
    }

    // Start
    let start = moment().subtract(argv.days, 'days')

    // End
    let end = moment()

    // Form data for our main request date filter
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartMonth'] = start.format('MMMM')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartDate'] = start.format('DD')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlStartYear'] = start.format('YYYY')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndMonth'] = end.format('MMMM')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndDate'] = end.format('DD')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlEndYear'] = end.format('YYYY')
    formData['ctl00$ctl00$cphContainer$cpContent$ddlSelectGame'] = 0
    formData['ctl00$ctl00$cphContainer$cpContent$btnSearch'] = 'Search Lotto'

    // Build the requestBody
    let requestBody = qs.stringify(formData)

    // Load the PSCO results page
    info('Loading results page')
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
      async (e, httpResponse, body) => {
        if (e) {
          fig('Error')
          err(e)
          return
        }

        // Page loaded, nice
        info('Results page loaded')

        // Parse the document
        info('Parsing the document')
        let document = (new JSDOM(body)).window.document

        // Load the results
        info('Parsing the result rows')
        let results = document.querySelectorAll('#cphContainer_cpContent_GridView1 tr td')
        let resultsCount = results.length / 5

        // Log some debug counts
        info('Found ' + resultsCount + ' results')

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

          // Check if we wanna split the time based games?
          if (!argv.split) {
            result.game = result.game.replace(/[\s]+[\d]+[AMP]+/g, '')
          }

          // Add to DB
          let res = await db.run(
            'INSERT INTO results ( game, numbers, stamp, prize, winners) VALUES ( $game, $numbers, $stamp, $prize, $winners)',
            {
              $game: result.game,
              $numbers: result.numbers.length,
              $stamp: result.stamp,
              $prize: result.prize,
              $winners: result.winners
            })

          // make a statement
          let stmt = await db.prepare('INSERT INTO numbers (result_id, value) VALUES ($result_id, $value)')

          // Loop the numbers
          for (let i = 0, len = result.numbers.length; i < len; i++) {
            stmt.run({
              $result_id: res.lastID,
              $value: result.numbers[i]
            })
          }

          // PENISH NA!
          stmt.finalize()
        }

        // Query the number of results in database
        let res = await db.get('SELECT COUNT(id) AS count FROM results')

        // We got them all!
        info('Saved ' + res.count + ' results')

        // Query all games
        let games = await db.all('SELECT game AS name, numbers FROM results GROUP BY game ORDER BY numbers ASC')

        // We need some data for our table
        let rows = [
          ['Game', 'Least Common', 'Most Common'].map(str => {
            return chalk.bold.blue(str)
          })
        ]

        for (let i = 0, len = games.length; i < len; i++) {
          // Load game data
          let game = games[i]

          game.least = (await db.all(
            `
              SELECT value, COUNT(numbers.id) AS count
              FROM numbers
              JOIN results ON results.id = result_id
              WHERE game = ?
              GROUP BY value
              ORDER BY count ASC
              LIMIT ?
            `,
            game.name,
            game.numbers
          )).map(num => {
            return String(num.value).padStart(2, '0')
          }).join('-')
          game.most = (await db.all(
            `
              SELECT value, COUNT(numbers.id) AS count
              FROM numbers
              JOIN results ON results.id = result_id
              WHERE game = ?
              GROUP BY value
              ORDER BY count DESC
              LIMIT ?
            `,
            game.name,
            game.numbers
          )).map(num => {
            return String(num.value).padStart(2, '0')
          }).join('-')

          // Add our row
          rows.push([
            chalk.red(game.name),
            chalk.yellow(game.least),
            chalk.yellow(game.most)
          ])
        }

        // Log the games
        cyan(table(rows))

        // PENISH NA!
        fig('DONE')
      }
    )
  }
)
