'use strict';

const Homey = require('homey');

module.exports = class MarstekCtApp extends Homey.App {
  async onInit() {
    this.log('Marstek CT app initialized');
  }
};
