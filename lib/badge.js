exports.V0_5_0 = 'v0.5.0';
exports.V1_0_0 = 'v1.0.0';

function isAssertion(json) {
  return typeof json.badge !== 'undefined';
}

function detectVersion(json) {
  if (isAssertion(json))
    return (typeof json.badge === 'object') ? exports.V0_5_0 : exports.V1_0_0;
  throw new Error('not an assertion');
}

exports.Badge = function Badge(data) {
  if (!isAssertion(data))
    throw new Error('Invalid badge data');
  
  this.metadata = data;
  this.version = detectVersion(data);

  return this;
};

exports.parse = function parse(json) {
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json);
    }
    catch (e) {
      throw new Error('Unable to parse as JSON');
    }
  }
  return new exports.Badge(json);
};