'use strict';

var mustache = require('mustache');

exports.LangfusePersistedProperty = void 0;
(function (LangfusePersistedProperty) {
  LangfusePersistedProperty["Props"] = "props";
  LangfusePersistedProperty["Queue"] = "queue";
  LangfusePersistedProperty["OptedOut"] = "opted_out";
})(exports.LangfusePersistedProperty || (exports.LangfusePersistedProperty = {}));

function assert(truthyValue, message) {
  if (!truthyValue) {
    throw new Error(message);
  }
}
function removeTrailingSlash(url) {
  return url?.replace(/\/+$/, "");
}
async function retriable(fn, props = {}, log) {
  const {
    retryCount = 3,
    retryDelay = 5000,
    retryCheck = () => true
  } = props;
  let lastError = null;
  for (let i = 0; i < retryCount + 1; i++) {
    if (i > 0) {
      // don't wait when it's the first try
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      log(`Retrying ${i + 1} of ${retryCount + 1}`);
    }
    try {
      const res = await fn();
      return res;
    } catch (e) {
      lastError = e;
      if (!retryCheck(e)) {
        throw e;
      }
      log(`Retriable error: ${JSON.stringify(e)}`);
    }
  }
  throw lastError;
}
// https://stackoverflow.com/a/8809472
function generateUUID(globalThis) {
  // Public Domain/MIT
  let d = new Date().getTime(); //Timestamp
  let d2 = globalThis && globalThis.performance && globalThis.performance.now && globalThis.performance.now() * 1000 || 0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : r & 0x3 | 0x8).toString(16);
  });
}
function currentTimestamp() {
  return new Date().getTime();
}
function currentISOTime() {
  return new Date().toISOString();
}
function safeSetTimeout(fn, timeout) {
  // NOTE: we use this so rarely that it is totally fine to do `safeSetTimeout(fn, 0)``
  // rather than setImmediate.
  const t = setTimeout(fn, timeout);
  // We unref if available to prevent Node.js hanging on exit
  t?.unref && t?.unref();
  return t;
}
function getEnv(key) {
  if (typeof process !== "undefined" && process.env[key]) {
    return process.env[key];
  } else if (typeof globalThis !== "undefined") {
    return globalThis[key];
  }
  return;
}
function configLangfuseSDK(params, secretRequired = true) {
  if (!params) {
    params = {};
  }
  const {
    publicKey,
    secretKey,
    ...coreOptions
  } = params;
  // check environment variables if values not provided
  const finalPublicKey = publicKey ?? getEnv("LANGFUSE_PUBLIC_KEY");
  const finalSecretKey = secretRequired ? secretKey ?? getEnv("LANGFUSE_SECRET_KEY") : undefined;
  const finalBaseUrl = coreOptions.baseUrl ?? getEnv("LANGFUSE_BASEURL");
  const finalCoreOptions = {
    ...coreOptions,
    baseUrl: finalBaseUrl
  };
  // check required parameters
  if (!finalPublicKey) {
    console.error("publicKey is required, but was not provided. It can be provided as an argument or as an environment variable LANGFUSE_PUBLIC_KEY.");
  }
  if (!finalSecretKey && secretRequired) {
    console.error("secretKey is required, but was not provided. It can be provided as an argument or as an environment variable LANGFUSE_SECRET_KEY.");
  }
  return {
    publicKey: finalPublicKey,
    ...(secretRequired ? {
      secretKey: finalSecretKey
    } : undefined),
    ...finalCoreOptions
  };
}

var utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  assert: assert,
  configLangfuseSDK: configLangfuseSDK,
  currentISOTime: currentISOTime,
  currentTimestamp: currentTimestamp,
  generateUUID: generateUUID,
  getEnv: getEnv,
  removeTrailingSlash: removeTrailingSlash,
  retriable: retriable,
  safeSetTimeout: safeSetTimeout
});

class SimpleEventEmitter {
  constructor() {
    this.events = {};
    this.events = {};
  }
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => {
      this.events[event] = this.events[event].filter(x => x !== listener);
    };
  }
  emit(event, payload) {
    for (const listener of this.events[event] || []) {
      listener(payload);
    }
    for (const listener of this.events["*"] || []) {
      listener(event, payload);
    }
  }
}

const common_release_envs = [
// Vercel
"VERCEL_GIT_COMMIT_SHA", "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
// Netlify
"COMMIT_REF",
// Render
"RENDER_GIT_COMMIT",
// GitLab CI
"CI_COMMIT_SHA",
// CicleCI
"CIRCLE_SHA1",
// Cloudflare pages
"CF_PAGES_COMMIT_SHA",
// AWS Amplify
"REACT_APP_GIT_SHA",
// Heroku
"SOURCE_VERSION"];
function getCommonReleaseEnvs() {
  for (const key of common_release_envs) {
    const value = getEnv(key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

mustache.escape = function (text) {
  return text;
};
class BasePromptClient {
  constructor(prompt) {
    this.name = prompt.name;
    this.version = prompt.version;
    this.config = prompt.config;
  }
  _transformToLangchainVariables(content) {
    return content.replace(/\{\{(.*?)\}\}/g, "{$1}");
  }
}
class TextPromptClient extends BasePromptClient {
  constructor(prompt) {
    super(prompt);
    this.promptResponse = prompt;
    this.prompt = prompt.prompt;
  }
  compile(variables) {
    return mustache.render(this.promptResponse.prompt, variables ?? {});
  }
  getLangchainPrompt() {
    /**
     * Converts Langfuse prompt into string compatible with Langchain PromptTemplate.
     *
     * It specifically adapts the mustache-style double curly braces {{variable}} used in Langfuse
     * to the single curly brace {variable} format expected by Langchain.
     *
     * @returns {string} The string that can be plugged into Langchain's PromptTemplate.
     */
    return this._transformToLangchainVariables(this.prompt);
  }
}
class ChatPromptClient extends BasePromptClient {
  constructor(prompt) {
    super(prompt);
    this.promptResponse = prompt;
    this.prompt = prompt.prompt;
  }
  compile(variables) {
    return this.prompt.map(chatMessage => ({
      ...chatMessage,
      content: mustache.render(chatMessage.content, variables ?? {})
    }));
  }
  getLangchainPrompt() {
    /**
     * Converts Langfuse prompt into string compatible with Langchain PromptTemplate.
     *
     * It specifically adapts the mustache-style double curly braces {{variable}} used in Langfuse
     * to the single curly brace {variable} format expected by Langchain.
     * Example usage:
     *
     * ```
     * import { ChatPromptTemplate } from "@langchain/core/prompts";
     *
     * const langchainChatPrompt = ChatPromptTemplate.fromMessages(
     *    langfuseChatPrompt.getLangchainPrompt().map((m) => [m.role, m.content])
     *  );
     *
     * const formattedPrompt = await langchainPrompt.format(values);
     *
     * ```
     * @returns {ChatMessage[]} Chat messages with variables that can be plugged into Langchain's ChatPromptTemplate.
     */
    return this.prompt.map(chatMessage => ({
      ...chatMessage,
      content: this._transformToLangchainVariables(chatMessage.content)
    }));
  }
}

const DEFAULT_PROMPT_CACHE_TTL_SECONDS = 60;
class LangfusePromptCacheItem {
  constructor(value, ttlSeconds) {
    this.value = value;
    this._expiry = Date.now() + ttlSeconds * 1000;
  }
  get isExpired() {
    return Date.now() > this._expiry;
  }
}
class LangfusePromptCache {
  constructor() {
    this._cache = new Map();
    this._defaultTtlSeconds = DEFAULT_PROMPT_CACHE_TTL_SECONDS;
  }
  getIncludingExpired(key) {
    return this._cache.get(key) ?? null;
  }
  set(key, value, ttlSeconds) {
    const effectiveTtlSeconds = ttlSeconds ?? this._defaultTtlSeconds;
    this._cache.set(key, new LangfusePromptCacheItem(value, effectiveTtlSeconds));
  }
}

class LangfuseMemoryStorage {
  constructor() {
    this._memoryStorage = {};
  }
  getProperty(key) {
    return this._memoryStorage[key];
  }
  setProperty(key, value) {
    this._memoryStorage[key] = value !== null ? value : undefined;
  }
}

class LangfuseFetchHttpError extends Error {
  constructor(response, body) {
    super("HTTP error while fetching Langfuse: " + response.status + " and body: " + body);
    this.response = response;
    this.name = "LangfuseFetchHttpError";
  }
}
class LangfuseFetchNetworkError extends Error {
  constructor(error) {
    super("Network error while fetching Langfuse", error instanceof Error ? {
      cause: error
    } : {});
    this.error = error;
    this.name = "LangfuseFetchNetworkError";
  }
}
function isLangfuseFetchError(err) {
  return typeof err === "object" && (err.name === "LangfuseFetchHttpError" || err.name === "LangfuseFetchNetworkError");
}
class LangfuseCoreStateless {
  constructor(params) {
    this.debugMode = false;
    this.pendingPromises = {};
    // internal
    this._events = new SimpleEventEmitter();
    const {
      publicKey,
      secretKey,
      ...options
    } = params;
    assert(publicKey, "You must pass your Langfuse project's api public key.");
    this.publicKey = publicKey;
    this.secretKey = secretKey;
    this.baseUrl = removeTrailingSlash(options?.baseUrl || "https://cloud.langfuse.com");
    this.flushAt = options?.flushAt ? Math.max(options?.flushAt, 1) : 15;
    this.flushInterval = options?.flushInterval ?? 10000;
    this.release = options?.release ?? getEnv("LANGFUSE_RELEASE") ?? getCommonReleaseEnvs() ?? undefined;
    this._retryOptions = {
      retryCount: options?.fetchRetryCount ?? 3,
      retryDelay: options?.fetchRetryDelay ?? 3000,
      retryCheck: isLangfuseFetchError
    };
    this.requestTimeout = options?.requestTimeout ?? 10000; // 10 seconds
    this.sdkIntegration = options?.sdkIntegration ?? "DEFAULT";
  }
  getSdkIntegration() {
    return this.sdkIntegration;
  }
  getCommonEventProperties() {
    return {
      $lib: this.getLibraryId(),
      $lib_version: this.getLibraryVersion()
    };
  }
  on(event, cb) {
    return this._events.on(event, cb);
  }
  debug(enabled = true) {
    this.removeDebugCallback?.();
    this.debugMode = enabled;
    if (enabled) {
      this.removeDebugCallback = this.on("*", (event, payload) => console.log("Langfuse Debug", event, JSON.stringify(payload)));
    }
  }
  /***
   *** Handlers for each object type
   ***/
  traceStateless(body) {
    const {
      id: bodyId,
      release: bodyRelease,
      ...rest
    } = body;
    const id = bodyId ?? generateUUID();
    const release = bodyRelease ?? this.release;
    const parsedBody = {
      id,
      release,
      ...rest
    };
    this.enqueue("trace-create", parsedBody);
    return id;
  }
  eventStateless(body) {
    const {
      id: bodyId,
      startTime: bodyStartTime,
      ...rest
    } = body;
    const id = bodyId ?? generateUUID();
    const parsedBody = {
      id,
      startTime: bodyStartTime ?? new Date(),
      ...rest
    };
    this.enqueue("event-create", parsedBody);
    return id;
  }
  spanStateless(body) {
    const {
      id: bodyId,
      startTime: bodyStartTime,
      ...rest
    } = body;
    const id = bodyId || generateUUID();
    const parsedBody = {
      id,
      startTime: bodyStartTime ?? new Date(),
      ...rest
    };
    this.enqueue("span-create", parsedBody);
    return id;
  }
  generationStateless(body) {
    const {
      id: bodyId,
      startTime: bodyStartTime,
      prompt,
      ...rest
    } = body;
    const id = bodyId || generateUUID();
    const parsedBody = {
      id,
      startTime: bodyStartTime ?? new Date(),
      ...(prompt ? {
        promptName: prompt.name,
        promptVersion: prompt.version
      } : {}),
      ...rest
    };
    this.enqueue("generation-create", parsedBody);
    return id;
  }
  scoreStateless(body) {
    const {
      id: bodyId,
      ...rest
    } = body;
    const id = bodyId || generateUUID();
    const parsedBody = {
      id,
      ...rest
    };
    this.enqueue("score-create", parsedBody);
    return id;
  }
  updateSpanStateless(body) {
    this.enqueue("span-update", body);
    return body.id;
  }
  updateGenerationStateless(body) {
    const {
      prompt,
      ...rest
    } = body;
    const parsedBody = {
      ...(prompt ? {
        promptName: prompt.name,
        promptVersion: prompt.version
      } : {}),
      ...rest
    };
    this.enqueue("generation-update", parsedBody);
    return body.id;
  }
  async _getDataset(name) {
    const encodedName = encodeURIComponent(name);
    return this.fetch(`${this.baseUrl}/api/public/datasets/${encodedName}`, this._getFetchOptions({
      method: "GET"
    })).then(res => res.json());
  }
  async getDatasetRun(params) {
    const encodedDatasetName = encodeURIComponent(params.datasetName);
    const encodedRunName = encodeURIComponent(params.runName);
    return this.fetch(`${this.baseUrl}/api/public/datasets/${encodedDatasetName}/runs/${encodedRunName}`, this._getFetchOptions({
      method: "GET"
    })).then(res => res.json());
  }
  async createDatasetRunItem(body) {
    return this.fetch(`${this.baseUrl}/api/public/dataset-run-items`, this._getFetchOptions({
      method: "POST",
      body: JSON.stringify(body)
    })).then(res => res.json());
  }
  /**
   * Creates a dataset. Upserts the dataset if it already exists.
   *
   * @param dataset Can be either a string (name) or an object with name, description and metadata
   * @returns A promise that resolves to the response of the create operation.
   */
  async createDataset(dataset) {
    const body = typeof dataset === "string" ? {
      name: dataset
    } : dataset;
    return this.fetch(`${this.baseUrl}/api/public/datasets`, this._getFetchOptions({
      method: "POST",
      body: JSON.stringify(body)
    })).then(res => res.json());
  }
  /**
   * Creates a dataset item. Upserts the item if it already exists.
   * @param body The body of the dataset item to be created.
   * @returns A promise that resolves to the response of the create operation.
   */
  async createDatasetItem(body) {
    return this.fetch(`${this.baseUrl}/api/public/dataset-items`, this._getFetchOptions({
      method: "POST",
      body: JSON.stringify(body)
    })).then(res => res.json());
  }
  async getDatasetItem(id) {
    return this.fetch(`${this.baseUrl}/api/public/dataset-items/${id}`, this._getFetchOptions({
      method: "GET"
    })).then(res => res.json());
  }
  _parsePayload(response) {
    try {
      return JSON.parse(response);
    } catch {
      return response;
    }
  }
  async createPromptStateless(body) {
    return this.fetch(`${this.baseUrl}/api/public/prompts`, this._getFetchOptions({
      method: "POST",
      body: JSON.stringify(body)
    })).then(res => res.json());
  }
  async getPromptStateless(name, version) {
    const url = `${this.baseUrl}/api/public/prompts?name=${name}` + (version ? `&version=${version}` : "");
    return this.fetch(url, this._getFetchOptions({
      method: "GET"
    })).then(async res => {
      const data = await res.json();
      return {
        fetchResult: res.status === 200 ? "success" : "failure",
        data
      };
    });
  }
  /***
   *** QUEUEING AND FLUSHING
   ***/
  enqueue(type, body) {
    try {
      const queue = this.getPersistedProperty(exports.LangfusePersistedProperty.Queue) || [];
      queue.push({
        id: generateUUID(),
        type,
        timestamp: currentISOTime(),
        body,
        metadata: undefined
      });
      this.setPersistedProperty(exports.LangfusePersistedProperty.Queue, queue);
      this._events.emit(type, body);
      // Flush queued events if we meet the flushAt length
      if (queue.length >= this.flushAt) {
        this.flush();
      }
      if (this.flushInterval && !this._flushTimer) {
        this._flushTimer = safeSetTimeout(() => this.flush(), this.flushInterval);
      }
    } catch (e) {
      this._events.emit("error", e);
    }
  }
  /**
   * Asynchronously flushes all events that are not yet sent to the server.
   * This function always resolves, even if there were errors when flushing.
   * Errors are emitted as "error" events and the promise resolves.
   *
   * @returns {Promise<void>} A promise that resolves when the flushing is completed.
   */
  flushAsync() {
    return new Promise((resolve, _reject) => {
      try {
        this.flush((err, data) => {
          if (err) {
            console.error("Error while flushing Langfuse", err);
            resolve();
          } else {
            resolve(data);
          }
        });
      } catch (e) {
        console.error("Error while flushing Langfuse", e);
      }
    });
  }
  // Flushes all events that are not yet sent to the server
  flush(callback) {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    const queue = this.getPersistedProperty(exports.LangfusePersistedProperty.Queue) || [];
    if (!queue.length) {
      return callback?.();
    }
    const items = queue.splice(0, this.flushAt);
    this.setPersistedProperty(exports.LangfusePersistedProperty.Queue, queue);
    const MAX_MSG_SIZE = 1_000_000;
    const BATCH_SIZE_LIMIT = 2_500_000;
    this.processQueueItems(items, MAX_MSG_SIZE, BATCH_SIZE_LIMIT);
    const promiseUUID = generateUUID();
    const done = err => {
      if (err) {
        this._events.emit("error", err);
      }
      callback?.(err, items);
      this._events.emit("flush", items);
    };
    const payload = JSON.stringify({
      batch: items,
      metadata: {
        batch_size: items.length,
        sdk_integration: this.sdkIntegration,
        sdk_version: this.getLibraryVersion(),
        sdk_variant: this.getLibraryId(),
        public_key: this.publicKey,
        sdk_name: "langfuse-js"
      }
    }); // implicit conversion also of dates to strings
    const url = `${this.baseUrl}/api/public/ingestion`;
    const fetchOptions = this._getFetchOptions({
      method: "POST",
      body: payload
    });
    const requestPromise = this.fetchWithRetry(url, fetchOptions).then(() => done()).catch(err => {
      done(err);
    });
    this.pendingPromises[promiseUUID] = requestPromise;
    requestPromise.finally(() => {
      delete this.pendingPromises[promiseUUID];
    });
  }
  processQueueItems(queue, MAX_MSG_SIZE, BATCH_SIZE_LIMIT) {
    let totalSize = 0;
    const processedItems = [];
    const remainingItems = [];
    for (let i = 0; i < queue.length; i++) {
      try {
        const itemSize = new Blob([JSON.stringify(queue[i])]).size;
        // discard item if it exceeds the maximum size per event
        if (itemSize > MAX_MSG_SIZE) {
          console.warn(`Item exceeds size limit (size: ${itemSize}), dropping item.`);
          continue;
        }
        // if adding the next item would exceed the batch size limit, stop processing
        if (totalSize + itemSize >= BATCH_SIZE_LIMIT) {
          console.debug(`hit batch size limit (size: ${totalSize + itemSize})`);
          remainingItems.push(...queue.slice(i));
          console.log(`Remaining items: ${remainingItems.length}`);
          console.log(`processes items: ${processedItems.length}`);
          break;
        }
        // only add the item if it passes both requirements
        totalSize += itemSize;
        processedItems.push(queue[i]);
      } catch (error) {
        console.error(error);
        remainingItems.push(...queue.slice(i));
        break;
      }
    }
    return {
      processedItems,
      remainingItems
    };
  }
  _getFetchOptions(p) {
    const fetchOptions = {
      method: p.method,
      headers: {
        "Content-Type": "application/json",
        "X-Langfuse-Sdk-Name": "langfuse-js",
        "X-Langfuse-Sdk-Version": this.getLibraryVersion(),
        "X-Langfuse-Sdk-Variant": this.getLibraryId(),
        "X-Langfuse-Sdk-Integration": this.sdkIntegration,
        "X-Langfuse-Public-Key": this.publicKey,
        ...this.constructAuthorizationHeader(this.publicKey, this.secretKey)
      },
      body: p.body
    };
    return fetchOptions;
  }
  constructAuthorizationHeader(publicKey, secretKey) {
    if (secretKey === undefined) {
      return {
        Authorization: "Bearer " + publicKey
      };
    } else {
      const encodedCredentials = typeof btoa === "function" ?
      // btoa() is available, the code is running in a browser or edge environment
      btoa(publicKey + ":" + secretKey) :
      // btoa() is not available, the code is running in Node.js
      Buffer.from(publicKey + ":" + secretKey).toString("base64");
      return {
        Authorization: "Basic " + encodedCredentials
      };
    }
  }
  async fetchWithRetry(url, options, retryOptions) {
    AbortSignal.timeout ??= function timeout(ms) {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), ms);
      return ctrl.signal;
    };
    return await retriable(async () => {
      let res = null;
      try {
        res = await this.fetch(url, {
          signal: AbortSignal.timeout(this.requestTimeout),
          ...options
        });
      } catch (e) {
        // fetch will only throw on network errors or on timeouts
        throw new LangfuseFetchNetworkError(e);
      }
      if (res.status < 200 || res.status >= 400) {
        const body = await res.json();
        throw new LangfuseFetchHttpError(res, JSON.stringify(body));
      }
      const returnBody = await res.json();
      if (res.status === 207 && returnBody.errors.length > 0) {
        throw new LangfuseFetchHttpError(res, JSON.stringify(returnBody.errors));
      }
      return res;
    }, {
      ...this._retryOptions,
      ...retryOptions
    }, string => this._events.emit("retry", string + ", " + url + ", " + JSON.stringify(options)));
  }
  async shutdownAsync() {
    clearTimeout(this._flushTimer);
    try {
      await this.flushAsync();
      await Promise.all(Object.values(this.pendingPromises).map(x => x.catch(() => {
        // ignore errors as we are shutting down and can't deal with them anyways.
      })));
      // flush again in case there are new events that were added while we were waiting for the pending promises to resolve
      await this.flushAsync();
    } catch (e) {
      console.error("Error while shutting down Langfuse", e);
    }
  }
  shutdown() {
    console.warn("shutdown() is deprecated. It does not wait for all events to be processed. Please use shutdownAsync() instead.");
    void this.shutdownAsync();
  }
  async awaitAllQueuedAndPendingRequests() {
    clearTimeout(this._flushTimer);
    await this.flushAsync();
    await Promise.all(Object.values(this.pendingPromises));
  }
}
class LangfuseWebStateless extends LangfuseCoreStateless {
  constructor(params) {
    const {
      flushAt,
      flushInterval,
      ...rest
    } = params;
    super({
      ...rest,
      flushAt: flushAt ?? 1,
      flushInterval: flushInterval ?? 0
    });
  }
  async score(body) {
    this.scoreStateless(body);
    await this.awaitAllQueuedAndPendingRequests();
    return this;
  }
}
class LangfuseCore extends LangfuseCoreStateless {
  constructor(params) {
    assert(params.publicKey, "You must pass your Langfuse project's api public key.");
    assert(params.secretKey, "You must pass your Langfuse project's api secret key.");
    super(params);
    this._promptCache = new LangfusePromptCache();
  }
  trace(body) {
    const id = this.traceStateless(body ?? {});
    const t = new LangfuseTraceClient(this, id);
    if (getEnv("DEFER") && body) {
      try {
        const deferRuntime = getEnv("__deferRuntime");
        if (deferRuntime) {
          deferRuntime.langfuseTraces([{
            id: id,
            name: body.name || "",
            url: t.getTraceUrl()
          }]);
        }
      } catch {}
    }
    return t;
  }
  span(body) {
    const traceId = body.traceId || this.traceStateless({
      name: body.name
    });
    const id = this.spanStateless({
      ...body,
      traceId
    });
    return new LangfuseSpanClient(this, id, traceId);
  }
  generation(body) {
    const traceId = body.traceId || this.traceStateless({
      name: body.name
    });
    const id = this.generationStateless({
      ...body,
      traceId
    });
    return new LangfuseGenerationClient(this, id, traceId);
  }
  event(body) {
    const traceId = body.traceId || this.traceStateless({
      name: body.name
    });
    const id = this.eventStateless({
      ...body,
      traceId
    });
    return new LangfuseEventClient(this, id, traceId);
  }
  score(body) {
    this.scoreStateless(body);
    return this;
  }
  async getDataset(name) {
    const {
      items,
      ...dataset
    } = await this._getDataset(name);
    const returnDataset = {
      ...dataset,
      description: dataset.description ?? undefined,
      metadata: dataset.metadata ?? undefined,
      items: items.map(item => ({
        ...item,
        link: async (obj, runName, runArgs) => {
          await this.awaitAllQueuedAndPendingRequests();
          const data = await this.createDatasetRunItem({
            runName,
            datasetItemId: item.id,
            observationId: obj.observationId,
            traceId: obj.traceId,
            runDescription: runArgs?.description,
            metadata: runArgs?.metadata
          });
          return data;
        }
      }))
    };
    return returnDataset;
  }
  async createPrompt(body) {
    const promptResponse = await this.createPromptStateless({
      ...body,
      type: body.type ?? "text"
    });
    if (promptResponse.type === "chat") {
      return new ChatPromptClient(promptResponse);
    }
    return new TextPromptClient(promptResponse);
  }
  async getPrompt(name, version, options) {
    const cacheKey = this._getPromptCacheKey(name, version);
    const cachedPrompt = this._promptCache.getIncludingExpired(cacheKey);
    if (!cachedPrompt) {
      return await this._fetchPromptAndUpdateCache(name, version, options?.cacheTtlSeconds);
    }
    if (cachedPrompt.isExpired) {
      return await this._fetchPromptAndUpdateCache(name, version, options?.cacheTtlSeconds).catch(() => {
        console.warn(`Returning expired prompt cache for '${name}-${version ?? "latest"}' due to fetch error`);
        return cachedPrompt.value;
      });
    }
    return cachedPrompt.value;
  }
  _getPromptCacheKey(name, version) {
    return `${name}-${version ?? "latest"}`;
  }
  async _fetchPromptAndUpdateCache(name, version, cacheTtlSeconds) {
    try {
      const {
        data,
        fetchResult
      } = await this.getPromptStateless(name, version);
      if (fetchResult === "failure") {
        throw Error(data.message ?? "Internal error while fetching prompt");
      }
      let prompt;
      if (data.type === "chat") {
        prompt = new ChatPromptClient(data);
      } else {
        prompt = new TextPromptClient(data);
      }
      // const prompt = data.type === "chat" ? new ChatPromptClient(data) : new TextPromptClient(data);
      this._promptCache.set(this._getPromptCacheKey(name, version), prompt, cacheTtlSeconds);
      return prompt;
    } catch (error) {
      console.error(`Error while fetching prompt '${name}-${version ?? "latest"}':`, error);
      throw error;
    }
  }
  _updateSpan(body) {
    this.updateSpanStateless(body);
    return this;
  }
  _updateGeneration(body) {
    this.updateGenerationStateless(body);
    return this;
  }
}
class LangfuseObjectClient {
  constructor({
    client,
    id,
    traceId,
    observationId
  }) {
    this.client = client;
    this.id = id;
    this.traceId = traceId;
    this.observationId = observationId;
  }
  event(body) {
    return this.client.event({
      ...body,
      traceId: this.traceId,
      parentObservationId: this.observationId
    });
  }
  span(body) {
    return this.client.span({
      ...body,
      traceId: this.traceId,
      parentObservationId: this.observationId
    });
  }
  generation(body) {
    return this.client.generation({
      ...body,
      traceId: this.traceId,
      parentObservationId: this.observationId
    });
  }
  score(body) {
    this.client.score({
      ...body,
      traceId: this.traceId,
      observationId: this.observationId
    });
    return this;
  }
  getTraceUrl() {
    return `${this.client.baseUrl}/trace/${this.traceId}`;
  }
}
class LangfuseTraceClient extends LangfuseObjectClient {
  constructor(client, traceId) {
    super({
      client,
      id: traceId,
      traceId,
      observationId: null
    });
  }
  update(body) {
    this.client.trace({
      ...body,
      id: this.id
    });
    return this;
  }
}
class LangfuseObservationClient extends LangfuseObjectClient {
  constructor(client, id, traceId) {
    super({
      client,
      id,
      traceId,
      observationId: id
    });
  }
}
class LangfuseSpanClient extends LangfuseObservationClient {
  constructor(client, id, traceId) {
    super(client, id, traceId);
  }
  update(body) {
    this.client._updateSpan({
      ...body,
      id: this.id,
      traceId: this.traceId
    });
    return this;
  }
  end(body) {
    this.client._updateSpan({
      ...body,
      id: this.id,
      traceId: this.traceId,
      endTime: new Date()
    });
    return this;
  }
}
class LangfuseGenerationClient extends LangfuseObservationClient {
  constructor(client, id, traceId) {
    super(client, id, traceId);
  }
  update(body) {
    this.client._updateGeneration({
      ...body,
      id: this.id,
      traceId: this.traceId
    });
    return this;
  }
  end(body) {
    this.client._updateGeneration({
      ...body,
      id: this.id,
      traceId: this.traceId,
      endTime: new Date()
    });
    return this;
  }
}
class LangfuseEventClient extends LangfuseObservationClient {
  constructor(client, id, traceId) {
    super(client, id, traceId);
  }
}

exports.ChatPromptClient = ChatPromptClient;
exports.LangfuseCore = LangfuseCore;
exports.LangfuseEventClient = LangfuseEventClient;
exports.LangfuseGenerationClient = LangfuseGenerationClient;
exports.LangfuseMemoryStorage = LangfuseMemoryStorage;
exports.LangfuseObjectClient = LangfuseObjectClient;
exports.LangfuseSpanClient = LangfuseSpanClient;
exports.LangfuseTraceClient = LangfuseTraceClient;
exports.LangfuseWebStateless = LangfuseWebStateless;
exports.TextPromptClient = TextPromptClient;
exports.utils = utils;
//# sourceMappingURL=index.cjs.js.map
