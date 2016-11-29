'use strict';

import _ from 'lodash';

/**
 * Format an array or object of floats for display:
 *
 * formatFloats({ foo: 3.14 }) => { foo: 3 }
 * formatFloats([ 3.14 ]) => [ 3 ]
 * formatFloats({ bar: 10.00 }) => { bar: 10 } // Side effect of parseFloat
 * formatFloats({ foo: 3.1415, bar: 10.00 }, 2) => { foo: 3.14, bar: 10 }
 * formatFloats({ foo: NaN, bar: 3.1415 }, 3) => { foo: 0, bar: 3.141 }
 * formatFloats([ NaN, 3.1415 ], 3) => [ 0, 3.141 ]
 *
 * @param floats Array | Object
 * @param precision Integer
 * @returns results Array | Object
 */
const formatFloats = (floats, precision = 0) => _.reduce(floats, (curr, value, key) => {
  curr[key] = _.isFinite(value) ? parseFloat(value.toFixed(precision)) : 0;
  return curr;
}, _.isArray(floats) ? [] : {});

/**
 * Format numbers as follows (with or without padding):
 *
 * (1000) => '1,000'
 * (1, 2) => '01'
 * (1, 4) => '0001'
 * (0, 2) => '0'
 * (NaN, 2) => '0'
 *
 * @param value Integer
 * @param padding Integer
 * @returns {number}
 */
const formatNumber = (value, padding = 0) => {
  let number = '0';

  if (!_.isFinite(value)) {
    return number;
  }

  number = value.toString();

  if (padding && number.length < padding) {
    number = value > 0 ? _.padStart(number, padding, 0) : '0';
  }

  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Provides bytes in multiple formats: bytes, kilobytes, megabytes, gigabytes, terabytes, petabytes, exabytes
 *
 * Each unit after byte is calculated in either decimal or binary:
 * Decimal: 10² = 1000
 * Binary: 2¹⁰ = 1024
 *
 * @param decimal Boolean
 * @returns byteMultiples Object
 *
 * @private
 */
const _getByteMultiples = (decimal = false) => {
  if (decimal) {
    return {
      b: 1,
      kb: 1e3,
      mb: 1e6,
      gb: 1e9,
      tb: 1e12,
      pb: 1e15,
      eb: 1e18,
    }
  }

  const kb = Math.pow(2, 10);

  return {
    b: 1,
    kb,
    mb: Math.pow(kb, 2),
    gb: Math.pow(kb, 3),
    tb: Math.pow(kb, 4),
    pb: Math.pow(kb, 5),
    eb: Math.pow(kb, 6),
  }
};

/**
 * Provides a map of values per multiplier. Defaults to binary calculation.
 *
 * @param bytes Integer
 * @param baseUnit String
 * @param decimal Boolean
 * @param precision Integer
 * @returns results Object
 *
 * @private
 */
const _bytesToValues = (bytes, { baseUnit = 'b', decimal = false, precision = 2 }) => {
  if (baseUnit !== 'b') {
    bytes = toBytes(bytes, { baseUnit, decimal });
  }

  const byteMultiples = _getByteMultiples(decimal);

  return formatFloats({
    b: bytes,
    kb: bytes / byteMultiples.kb,
    mb: bytes / byteMultiples.mb,
    gb: bytes / byteMultiples.gb,
    tb: bytes / byteMultiples.tb,
    pb: bytes / byteMultiples.pb,
    eb: bytes / byteMultiples.eb,
  }, precision);
};

/**
 * Convert a value to bytes:
 *
 * toBytes(1) => 1024
 * toBytes(23, 'mb') => 24117248
 * toBytes(23, 'mb', true) => 23000000
 * toBytes(2.3, 'mb', true) => 23000 ??? Will this work ???
 * 
 * @param value Number
 * @param baseUnit String
 * @param decimal Boolean
 *
 * @returns bytes Integer
 */
const toBytes = (value, baseUnit = 'kb', decimal = false) => value * (_getByteMultiples(decimal)[baseUnit] || 1);

/**
 * Attempts to provide an object containing the most value to display for a given number of bytes.
 *
 * (1000) => { value: 1, label: 'kb', ... }
 * (1000, 10, 10000) => { value: 1000, label: 'b', ... }
 * (2000, 1, 1000, { baseUnit: 'mb' }) => { value: 2, label: 'gb', ... }
 *
 * @param value Integer
 * @param lower Integer
 * @param upper Integer
 * @param options Object
 *  BaseUnit provides instruction on what measurement value is. i.e if value = 2 and baseUnit = 'kb' then the
 *  calculations are made on the basis that value = 2000 bytes
 *
 * @returns {{key: (*|string), label: string, value, allValues}} Object
 */
const formatBytes = (value, lower = 1, upper = 1000, options) => {
  const values = _bytesToValues(value, options);
  const key = _.findKey(values, (value) => (value >= lower && value < upper)) || 'b';

  return {
    key: key,
    label: (key).toString().toUpperCase(),
    value: values[key],
    allValues: values,
  };
};

/**
 * Calculates the differences between two objects:
 * 
 * diff({ a: 1 }, { a: 2 }) => { a: [1, 2] }
 * diff({ a: 1 }, { b: 2 }) => { a: [1, undefined], b: [undefined, 2] }
 * diff({ a: { a1: 1 } }, { a: { a1: 2 } }) => { a: { a1: [1, 2] } }
 * 
 * @param obj1 Object
 * @param obj2 Object
 * @returns diff Object
 */
const diff = (obj1 = {}, obj2 = {}) => _.reduce(obj1, (curr, value, key) => {
  if (_.isPlainObject(value)) {
    const deepDiff = diff(obj1[key], obj2[key]);

    if(_.isPlainObject(deepDiff) && _.isEmpty(deepDiff)) {
      return curr;
    }
    curr[key] = deepDiff;
  } else if (!_.isEqual(value, obj2[key])) {
    curr[key] = [value, obj2[key]];
  }

  return curr;
}, {});

/**
 * Extend Lo-dash with utility methods
 */
_.mixin(_, {
  formatFloats,
  formatNumber,
  formatBytes,
  toBytes,
  diff,
});
