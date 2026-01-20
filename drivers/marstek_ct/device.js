'use strict';

const Homey = require('homey');
const MarstekClient = require('../../lib/marstekClient');

const OPTIONAL_PHASE_CAPS = ['measure_power.l1', 'measure_power.l2', 'measure_power.l3'];

module.exports = class MarstekCtDevice extends Homey.Device {
  async onInit() {
    this._consecutiveFailures = 0;
    this._pollTimer = null;
    this._payload = null;
    this._settings = this._getEffectiveSettings(this.getSettings());
    this._missingCapsLogged = new Set();
    this._lastPollTime = null;

    await this._ensureOptionalCapabilities();

    this._rebuildPayload();
    this._startPolling();
  }

  async onSettings({ newSettings, changedKeys }) {
    this._settings = this._getEffectiveSettings(newSettings);

    if (changedKeys.includes('host')
      || changedKeys.includes('device_type')
      || changedKeys.includes('battery_mac')
      || changedKeys.includes('ct_mac')
      || changedKeys.includes('ct_type')) {
      this._rebuildPayload();
    }

    if (changedKeys.includes('poll_interval_seconds')) {
      this._startPolling();
    }

    if (changedKeys.includes('timeout_ms') || changedKeys.includes('retries') || changedKeys.includes('debug')) {
      this._startPolling();
    }
  }

  async onUninit() {
    this._stopPolling();
  }

  async onDeleted() {
    this._stopPolling();
  }

  _getEffectiveSettings(settings) {
    const clamp = (value, min, max, fallback) => {
      const num = Number(value);
      if (Number.isNaN(num)) return fallback;
      return Math.min(Math.max(num, min), max);
    };

    return {
      host: settings.host,
      port: settings.port || 12345,
      device_type: settings.device_type,
      battery_mac: settings.battery_mac,
      ct_mac: settings.ct_mac,
      ct_type: settings.ct_type,
      poll_interval_seconds: clamp(settings.poll_interval_seconds, 2, 60, 10),
      timeout_ms: clamp(settings.timeout_ms, 500, 5000, 1500),
      retries: clamp(settings.retries, 0, 5, 2),
      debug: Boolean(settings.debug),
    };
  }

  async _ensureOptionalCapabilities() {
    // Ensure delivery and production capabilities exist
    const energyCaps = ['measure_power.delivery', 'measure_power.production'];
    for (const capability of energyCaps) {
      if (this.hasCapability(capability)) {
        continue;
      }
      try {
        await this.addCapability(capability);
      } catch (err) {
        this.log(`Optional capability not available: ${capability}`);
      }
    }

    // Ensure phase capabilities exist
    for (const capability of OPTIONAL_PHASE_CAPS) {
      if (this.hasCapability(capability)) {
        continue;
      }
      try {
        await this.addCapability(capability);
      } catch (err) {
        this.log(`Optional capability not available: ${capability}`);
      }
    }
  }

  _rebuildPayload() {
    try {
      this._payload = MarstekClient.buildPayload({
        deviceType: this._settings.device_type,
        batteryMac: this._settings.battery_mac,
        ctType: this._settings.ct_type,
        ctMac: this._settings.ct_mac,
      });
    } catch (err) {
      this.error(`Failed to build payload: ${err.message}`);
      this._payload = null;
    }
  }

  _startPolling() {
    this._stopPolling();
    const intervalMs = this._settings.poll_interval_seconds * 1000;
    this._pollTimer = setInterval(() => {
      this._pollOnce().catch((err) => this.error(err));
    }, intervalMs);
    this._pollOnce().catch((err) => this.error(err));
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  async _pollOnce() {
    if (!this._payload) {
      this._rebuildPayload();
      if (!this._payload) {
        return;
      }
    }

    const response = await this._fetchWithRetries();
    if (response.error) {
      this._consecutiveFailures += 1;
      if (this._settings.debug) {
        this.log(`Polling error: ${response.error}`);
      }
      if (this._consecutiveFailures >= 5) {
        await this.setUnavailable('No response from meter');
      }
      return;
    }

    this._consecutiveFailures = 0;
    await this.setAvailable();
    await this._updateCapabilities(response);
  }

  async _fetchWithRetries() {
    let lastResult = { error: 'Unknown error' };
    const attempts = this._settings.retries + 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      lastResult = await MarstekClient.request({
        host: this._settings.host,
        port: this._settings.port || 12345,
        payload: this._payload,
        timeoutMs: this._settings.timeout_ms,
        debug: this._settings.debug,
        logger: this,
      });
      if (!lastResult.error) {
        return lastResult;
      }
    }

    return lastResult;
  }

  async _updateCapabilities(data) {
    const now = Date.now();

    if (typeof data.total_power === 'number') {
      await this.setCapabilityValue('measure_power', data.total_power);

      // Calculate delivery (import) and production (export) for Homey Energy
      // Positive = import/delivery, Negative = export/production
      const delivery = data.total_power > 0 ? data.total_power : 0;
      const production = data.total_power < 0 ? Math.abs(data.total_power) : 0;

      if (this.hasCapability('measure_power.delivery')) {
        await this.setCapabilityValue('measure_power.delivery', delivery);
      }
      if (this.hasCapability('measure_power.production')) {
        await this.setCapabilityValue('measure_power.production', production);
      }

      this._lastPollTime = now;
    }
    if (typeof data.wifi_rssi === 'number') {
      await this.setCapabilityValue('measure_signal_strength', data.wifi_rssi);
    }

    await this._setOptionalCapability('measure_power.l1', data.A_phase_power);
    await this._setOptionalCapability('measure_power.l2', data.B_phase_power);
    await this._setOptionalCapability('measure_power.l3', data.C_phase_power);
  }

  async _setOptionalCapability(capability, value) {
    if (typeof value !== 'number') {
      return;
    }
    if (!this.hasCapability(capability)) {
      if (!this._missingCapsLogged.has(capability)) {
        this.log(`Optional capability missing: ${capability}`);
        this._missingCapsLogged.add(capability);
      }
      return;
    }
    await this.setCapabilityValue(capability, value);
  }
};
