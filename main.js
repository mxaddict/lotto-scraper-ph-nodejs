'use strict';

// Load dependencies
const _figlet   = require('figlet');
const _request  = require('request');
const _jsdom    = require("jsdom");
const _fs       = require('fs');
const { JSDOM } = _jsdom;

// We need an easy way to use the console.log command
let log    = console.log;
let fig    = (string) =>
  log(_figlet.textSync(string.replace(/ /g, '  ')))

fig("Started the scraper");
log("Instantiated crawler");
log("Loading results page");

// We need a place to save our results
var _results = [];

// Where do we save the results
let _results_save_path = "./results.json";

// Load the PSCO results page
_request.post(
  {
    url:'http://www.pcso.gov.ph/lotto-search/lotto-search.aspx',
    form: {
      key:'value'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/58.0.3029.81 Chrome/58.0.3029.81 Safari/537.36'
    }
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

    // Save the results
    log("Saving results in " + _results_save_path);
    _fs.writeFileSync(_results_save_path, JSON.stringify(_results, null, 2) , 'utf-8');

    fig("Scraper Done");
  }
);
