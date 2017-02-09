'use strict'

var path = require('path')
var spawn = require('cross-spawn')
var chalk = require('chalk')

var mocha = path.resolve(process.cwd(), 'node_modules', '.bin', 'mocha')

var args = [
  '--colors',
  '--compilers js:ts-node/register',
  !process.env.CI && (console.log(chalk.green.bold('Enabling watch mode')) || '--watch'),
  'test/**/*test.ts'
].filter(Boolean)

spawn(mocha, args, {stdio: 'inherit'})
