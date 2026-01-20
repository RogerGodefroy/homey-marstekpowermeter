const Homey = require('homey');

module.exports = class MarstekCtApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Marstek CT app initialized');
  }

};
