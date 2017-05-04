'use strict';

// Load dependencies
const _figlet   = require('figlet');
const _request  = require('request');
const _qs       = require('querystring');
const _jsdom    = require("jsdom");
const _fs       = require('fs');
const { JSDOM } = _jsdom;

// We need an easy way to use the console.log command
let log    = console.log;
let fig    = (string) =>
  log(_figlet.textSync(string.replace(/ /g, '  ')))

// What is the URL for the results page?
let results_url     = 'http://www.pcso.gov.ph/lotto-search/lotto-search.aspx';
let request_headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/58.0.3029.81 Chrome/58.0.3029.81 Safari/537.36'
}

fig("Started the scraper");
log("Loading hidden fields on results page");

// We need a place to save our results
var _results = [];

// Where do we save the results
let _results_save_path = "./results.json";

// Load the first page so that we can get the hidden field
_request.get(
  {
    url: results_url,
    headers: request_headers
  },
  function(err, httpResponse, body){
    if (err) {
      fig("Error");
      log(err);
      return;
    }

    // Where to save our fields
    var form_data = {};

    // Parse the hidden document
    log("Parse the hidde document");
    let hidden_document = (new JSDOM(body)).window.document;

    // Load the results
    log("Parse the hidden fields");
    let fields = hidden_document.querySelectorAll('form input[type=hidden]');

    // Loop the found fields
    for (var i = 0, len = fields.length; i < len; i++) {
      form_data[fields[i].name] = fields[i].value;
    }

    // Form data for our main request date filter
    form_data.ddlStartMonth = 'January';
    form_data.ddlStartDate  = 1;
    form_data.ddlStartYear  = 2007;
    form_data.ddlEndMonth   = (new Date).toLocaleString("en-us", { month: "long" });
    form_data.ddlEndDay     = (new Date).getDate();
    form_data.ddlEndYear    = (new Date).getFullYear();
    form_data.ddlSelectGame = 0;
    form_data.btnSearch     = 'Search Lotto';

    // Build the request_body
    let request_body = _qs.stringify(form_data)

    // Load the PSCO results page
    log("Loading results page");
    _request.post(
      {
        url:'http://www.pcso.gov.ph/lotto-search/lotto-search.aspx',
        body: request_body,
        headers: {
          'User-Agent':     request_headers['User-Agent'],
          'Content-Length': request_body.length,
          'Content-Type':   'application/x-www-form-urlencoded'
        },
      },
      function(err, httpResponse, body){
        if (err) {
          fig("Error");
          log(err);
          return;
        }
        // Page loaded, nice
        log("Results page loaded");

        // Parse the document
        log("Parse the document");
        let document = (new JSDOM(body)).window.document;

        // Load the results
        log("Parse the result rows");
        let results = document.querySelectorAll('#GridView1 tr td');
        let results_count = results.length / 5;

        // Loop the results
        for (var i = 0, len = results_count; i < len; i++) {
          var x = i * 5;
          _results.push({
            game:    results[x+0].innerHTML,
            result:  results[x+1].innerHTML,
            date:    results[x+2].innerHTML,
            prize:   results[x+3].innerHTML,
            winners: results[x+4].innerHTML
          });
        }

        // Log some debug counts
        log("Found " + _results.length + " results");

        // Save the results
        log("Saving results in " + _results_save_path);
        _fs.writeFileSync(_results_save_path, JSON.stringify(_results, null, 2) , 'utf-8');

        fig("Scraper Done");
      }
    );
  }
);

