'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var langfuseCore = require('langfuse-core');
var axios = require('axios');

var version = "3.7.0";

// NOTE: We use axios as a reliable, well supported request library but follow the Fetch API (roughly)
// So that alternative implementations can be used if desired
const fetch = async (url, options) => {
  const res = await axios.request({
    url,
    headers: options.headers,
    method: options.method.toLowerCase(),
    data: options.body,
    signal: options.signal,
    // fetch only throws on network errors, not on HTTP errors
    validateStatus: () => true
  });
  return {
    status: res.status,
    text: async () => res.data,
    json: async () => res.data
  };
};

// The actual exported Nodejs API.
class Langfuse extends langfuseCore.LangfuseCore {
  constructor(params) {
    const {
      publicKey,
      secretKey,
      ...options
    } = langfuseCore.utils.configLangfuseSDK(params);
    if (!secretKey) {
      throw new Error("[Langfuse] secretKey is required for instantiation");
    }
    if (!publicKey) {
      throw new Error("[Langfuse] publicKey is required for instantiation");
    }
    super({
      publicKey,
      secretKey,
      ...options
    });
    this._memoryStorage = new langfuseCore.LangfuseMemoryStorage();
    this.options = options;
  }
  getPersistedProperty(key) {
    return this._memoryStorage.getProperty(key);
  }
  setPersistedProperty(key, value) {
    return this._memoryStorage.setProperty(key, value);
  }
  fetch(url, options) {
    return this.options.fetch ? this.options.fetch(url, options) : fetch(url, options);
  }
  getLibraryId() {
    return "langfuse-node";
  }
  getLibraryVersion() {
    return version;
  }
  getCustomUserAgent() {
    return `langfuse-node/${version}`;
  }
}

exports.Langfuse = Langfuse;
exports.default = Langfuse;
//# sourceMappingURL=index.cjs.js.map
