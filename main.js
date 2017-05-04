'use strict';

// Load dependencies
let figlet  = require('figlet');
let crawler =

// We need an easy way to use the console.log command
let log    = console.log;
let fig    = (string) =>
  log(figlet.textSync(string.replace(/ /g, '  ')))

fig("Started the scraper");
