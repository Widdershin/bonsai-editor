'use strict'

var path = require('path')
var budo = require('budo')
var babelify = require('babelify')
var tsify = require('tsify');
var envify = require('envify/custom')
var babelConfig = require('../config/babel');
// var hotModuleReload = require('browserify-hmr')

require('dotenv').config({silent: true})

budo(path.join('src', 'index.js'), {
  serve: 'bundle.js',
  dir: 'public',
  live: true,
  port: 8000,
  stream: process.stdout,
  browserify: {
    // plugin: hotModuleReload,
    debug: true,
    insertGlobals: true,
    plugin: tsify
  }
})
