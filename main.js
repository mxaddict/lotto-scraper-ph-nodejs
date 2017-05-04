'use strict';

// Load dependencies
const _figlet   = require('figlet');
const _crawler  = require("js-crawler");
const _jsdom    = require("jsdom");
const { JSDOM } = _jsdom;

// We need an easy way to use the console.log command
let log    = console.log;
let fig    = (string) =>
  log(_figlet.textSync(string.replace(/ /g, '  ')))

fig("Started the scraper");

// Setup a crawler that only loads one page deep
let crawler = new _crawler().configure({depth: 1});

log("Instantiated crawler");
log("Loading results page");

// We need a place to save our results
var _results = [];

// Load the PSCO results page
crawler.crawl({
  url: "http://www.pcso.gov.ph/lotto-search/lotto-search.aspx",
  success: function(page) {
    // Page loaded, nice
    log("Results page loaded");

    // Parse the document
    log("Parse the document");
    let document = (new JSDOM(page.body)).window.document;

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

    log(_results);
  },
  failure: function(page) {
    log('ERROR: ' + page.status + ' | Could not load page');
  }
});
