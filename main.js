'use strict'

// Load dependencies
const _figlet = require('figlet')
const _request = require('request')
const _qs = require('querystring')
const _jsdom = require('jsdom')
const _fs = require('fs')
const { JSDOM } = _jsdom

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
log('Loading hidden fields on results page')

// We need a place to save our results
let _results = {}

// Where do we save the results
let resultSavePath = './results.json'

// Load the first page so that we can get the hidden field
_request.get(
  {
    url: searchUrl,
    headers: headers
  },
  function (err, httpResponse, body) {
    if (err) {
      fig('Error')
      log(err)
      return
    }

    // Where to save our fields
    let formData = {}

    // Parse the hidden document
    log('Parse the hidden document')
    let hiddenDocument = (new JSDOM(body)).window.document

    // Load the results
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
    let requestBody = _qs.stringify(formData)

    // Load the PSCO results page
    log('Loading results page')
    _request.post(
      {
        url: searchUrl,
        body: requestBody,
        headers: {
          'User-Agent': headers['User-Agent'],
          'Content-Length': requestBody.length,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      },
      function (err, httpResponse, body) {
        if (err) {
          fig('Error')
          log(err)
          return
        }
        // Page loaded, nice
        log('Results page loaded')

        // Parse the document
        log('Parse the document')
        let document = (new JSDOM(body)).window.document

        // Load the results
        log('Parse the result rows')
        let results = document.querySelectorAll('#cphContainer_cpContent_GridView1 tr td')
        let resultsCount = results.length / 5

        // Temp result
        let _result = {}

        // We need a place to save the count
        let _resultsCount = 0

        // Loop the results
        for (let i = 0, len = resultsCount; i < len; i++) {
          // Calculate the index
          let x = i * 5

          // Build the temp result object
          _result = {
            game: results[x + 0].innerHTML,
            result: results[x + 1].innerHTML,
            ordered: results[x + 1].innerHTML.split('-').sort().join('-'),
            date: results[x + 2].innerHTML,
            prize: results[x + 3].innerHTML,
            winners: results[x + 4].innerHTML
          }

          // Check if we have the game
          if (_results[_result.game] === undefined) {
            _results[_result.game] = {}
          }

          // Check if we have the date
          if (_results[_result.game][_result.date] === undefined) {
            _results[_result.game][_result.date] = []
          }

          // Save the _result
          _results[_result.game][_result.date].push(_result)

          // Count this result
          _resultsCount++
        }

        // Log some debug counts
        log('Found ' + _resultsCount + ' results')

        // Save the results
        log('Saving results in ' + resultSavePath)
        _fs.writeFileSync(resultSavePath, JSON.stringify(_results, null, 2), 'utf-8')

        // Loop all the

        fig('DONE')
      }
    )
  }
)
