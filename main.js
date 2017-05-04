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

// Load the PSCO results page
crawler.crawl({
  url: "http://www.pcso.gov.ph/lotto-search/lotto-search.aspx",
  success: function(page) {
    log("Results page loaded");
    let dom = new JSDOM(page.body);
    console.log(dom);
  },
  failure: function(page) {
    log('ERROR: ' + page.status + ' | Could not load page');
  }
});
