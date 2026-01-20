'use strict';

const dgram = require('dgram');
const { setTimeout, clearTimeout } = require('timers');

const SOH = 0x01;
const STX = 0x02;
const ETX = 0x03;

const RESPONSE_LABELS = [
  'meter_dev_type',
  'meter_mac_code',
  'hhm_dev_type',
  'hhm_mac_code',
  'A_phase_power',
  'B_phase_power',
  'C_phase_power',
  'total_power',
  'A_chrg_nb',
  'B_chrg_nb',
  'C_chrg_nb',
  'ABC_chrg_nb',
  'wifi_rssi',
  'info_idx',
  'x_chrg_power',
  'A_chrg_power',
  'B_chrg_power',
  'C_chrg_power',
  'ABC_chrg_power',
  'x_dchrg_power',
  'A_dchrg_power',
  'B_dchrg_power',
  'C_dchrg_power',
  'ABC_dchrg_power',
];

function isAscii(buffer) {
  for (const byte of buffer) {
    if (byte > 0x7F) {
      return false;
    }
  }
  return true;
}

function xorChecksum(buffer) {
  let checksum = 0x00;
  for (const byte of buffer) {
    checksum ^= byte;
  }
  return checksum;
}

function normalizeMac(input) {
  const cleaned = String(input || '').replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error('MAC must be 12 hex characters');
  }
  return cleaned;
}

function buildPayload({
  deviceType,
  batteryMac,
  ctType,
  ctMac,
}) {
  const normalizedBattery = normalizeMac(batteryMac);
  const normalizedCt = normalizeMac(ctMac);
  const message = `|${deviceType}|${normalizedBattery}|${ctType}|${normalizedCt}|0|0`;
  const messageBytes = Buffer.from(message, 'ascii');

  const baseSize = 1 + 1 + messageBytes.length + 1 + 2;
  let totalLength = baseSize + String(baseSize + 2).length;
  if (String(totalLength).length !== String(baseSize + 2).length) {
    totalLength = baseSize + String(totalLength).length;
  }
  const lengthBytes = Buffer.from(String(totalLength), 'ascii');

  const payloadWithoutChecksum = Buffer.concat([
    Buffer.from([SOH, STX]),
    lengthBytes,
    messageBytes,
    Buffer.from([ETX]),
  ]);
  const checksum = xorChecksum(payloadWithoutChecksum);
  const checksumHex = checksum.toString(16).padStart(2, '0');
  return Buffer.concat([payloadWithoutChecksum, Buffer.from(checksumHex, 'ascii')]);
}

function parseResponse(data) {
  if (!data || !Buffer.isBuffer(data)) {
    return { error: 'Invalid response buffer' };
  }
  if (!isAscii(data)) {
    return { error: 'Invalid ASCII encoding' };
  }
  if (data.length < 7) {
    return { error: 'Response too short' };
  }

  const payloadSlice = data.slice(4, data.length - 3);
  const message = payloadSlice.toString('ascii');
  const parts = message.split('|').slice(1);
  const result = {};

  RESPONSE_LABELS.forEach((label, index) => {
    const value = parts[index] ?? '';
    if (/^-?\d+$/.test(value)) {
      result[label] = parseInt(value, 10);
    } else {
      result[label] = value;
    }
  });

  return result;
}

function sendRequest({
  host,
  port,
  payload,
  timeoutMs,
}) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      try {
        socket.close();
      } catch (err) {
        // ignore close errors
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout - No response from meter'));
    }, timeoutMs);

    socket.once('message', (message) => {
      clearTimeout(timer);
      cleanup();
      resolve(message);
    });

    socket.once('error', (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err);
    });

    socket.send(payload, port, host, (err) => {
      if (err) {
        clearTimeout(timer);
        cleanup();
        reject(err);
      }
    });
  });
}

async function request({
  host,
  port,
  payload,
  timeoutMs,
  debug,
  logger,
}) {
  try {
    if (debug && logger) {
      logger.log(`UDP payload (hex): ${payload.toString('hex')}`);
    }
    const raw = await sendRequest({
      host, port, payload, timeoutMs,
    });
    if (debug && logger) {
      logger.log(`UDP response (hex): ${raw.toString('hex')}`);
    }
    const parsed = parseResponse(raw);
    if (debug && logger) {
      logger.log(`Parsed response: ${JSON.stringify(parsed)}`);
    }
    return parsed;
  } catch (err) {
    return { error: err && err.message ? err.message : String(err) };
  }
}

module.exports = {
  buildPayload,
  parseResponse,
  request,
  normalizeMac,
};
