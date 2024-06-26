import { LangfuseCore, utils, LangfuseWebStateless } from 'langfuse-core';

var version = "3.7.0";

// Methods partially borrowed from quirksmode.org/js/cookies.html
const cookieStore = {
  getItem(key) {
    try {
      const nameEQ = key + "=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
          c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
    } catch (err) {}
    return null;
  },
  setItem(key, value) {
    try {
      const cdomain = "",
        expires = "",
        secure = "";
      const new_cookie_val = key + "=" + encodeURIComponent(value) + expires + "; path=/" + cdomain + secure;
      document.cookie = new_cookie_val;
    } catch (err) {
      return;
    }
  },
  removeItem(name) {
    try {
      cookieStore.setItem(name, "");
    } catch (err) {
      return;
    }
  },
  clear() {
    document.cookie = "";
  },
  getAllKeys() {
    const ca = document.cookie.split(";");
    const keys = [];
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == " ") {
        c = c.substring(1, c.length);
      }
      keys.push(c.split("=")[0]);
    }
    return keys;
  }
};
const createStorageLike = store => {
  return {
    getItem(key) {
      return store.getItem(key);
    },
    setItem(key, value) {
      store.setItem(key, value);
    },
    removeItem(key) {
      store.removeItem(key);
    },
    clear() {
      store.clear();
    },
    getAllKeys() {
      const keys = [];
      for (const key in localStorage) {
        keys.push(key);
      }
      return keys;
    }
  };
};
const checkStoreIsSupported = (storage, key = "__mplssupport__") => {
  if (!window) {
    return false;
  }
  try {
    const val = "xyz";
    storage.setItem(key, val);
    if (storage.getItem(key) !== val) {
      return false;
    }
    storage.removeItem(key);
    return true;
  } catch (err) {
    return false;
  }
};
let localStore = undefined;
let sessionStore = undefined;
const createMemoryStorage = () => {
  const _cache = {};
  const store = {
    getItem(key) {
      return _cache[key];
    },
    setItem(key, value) {
      _cache[key] = value !== null ? value : undefined;
    },
    removeItem(key) {
      delete _cache[key];
    },
    clear() {
      for (const key in _cache) {
        delete _cache[key];
      }
    },
    getAllKeys() {
      const keys = [];
      for (const key in _cache) {
        keys.push(key);
      }
      return keys;
    }
  };
  return store;
};
const getStorage = (type, window) => {
  if (typeof window !== undefined && window) {
    if (!localStorage) {
      const _localStore = createStorageLike(window.localStorage);
      localStore = checkStoreIsSupported(_localStore) ? _localStore : undefined;
    }
    if (!sessionStore) {
      const _sessionStore = createStorageLike(window.sessionStorage);
      sessionStore = checkStoreIsSupported(_sessionStore) ? _sessionStore : undefined;
    }
  }
  switch (type) {
    case "cookie":
      return cookieStore || localStore || sessionStore || createMemoryStorage();
    case "localStorage":
      return localStore || sessionStore || createMemoryStorage();
    case "sessionStorage":
      return sessionStore || createMemoryStorage();
    case "memory":
      return createMemoryStorage();
    default:
      return createMemoryStorage();
  }
};

class Langfuse extends LangfuseCore {
  constructor(params) {
    const {
      publicKey,
      secretKey,
      ...options
    } = utils.configLangfuseSDK(params);
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
    if (typeof window !== "undefined" && "Deno" in window === false) {
      this._storageKey = params?.persistence_name ? `lf_${params.persistence_name}` : `lf_${publicKey}_langfuse`;
      this._storage = getStorage(params?.persistence || "localStorage", window);
    } else {
      this._storageKey = `lf_${publicKey}_langfuse`;
      this._storage = getStorage("memory", undefined);
    }
  }
  getPersistedProperty(key) {
    if (!this._storageCache) {
      this._storageCache = JSON.parse(this._storage.getItem(this._storageKey) || "{}") || {};
    }
    return this._storageCache[key];
  }
  setPersistedProperty(key, value) {
    if (!this._storageCache) {
      this._storageCache = JSON.parse(this._storage.getItem(this._storageKey) || "{}") || {};
    }
    if (value === null) {
      delete this._storageCache[key];
    } else {
      this._storageCache[key] = value;
    }
    this._storage.setItem(this._storageKey, JSON.stringify(this._storageCache));
  }
  fetch(url, options) {
    return fetch(url, options);
  }
  getLibraryId() {
    return "langfuse";
  }
  getLibraryVersion() {
    return version;
  }
  getCustomUserAgent() {
    return;
  }
}
class LangfuseWeb extends LangfuseWebStateless {
  constructor(params) {
    const {
      publicKey,
      ...options
    } = utils.configLangfuseSDK(params, false);
    if (!publicKey) {
      throw new Error("[Langfuse] publicKey is required for instantiation");
    }
    super({
      publicKey,
      ...options
    });
    if (typeof window !== "undefined") {
      this._storageKey = params?.persistence_name ? `lf_${params.persistence_name}` : `lf_${publicKey}_langfuse`;
      this._storage = getStorage(params?.persistence || "localStorage", window);
    } else {
      this._storageKey = `lf_${publicKey}_langfuse`;
      this._storage = getStorage("memory", undefined);
    }
  }
  getPersistedProperty(key) {
    if (!this._storageCache) {
      this._storageCache = JSON.parse(this._storage.getItem(this._storageKey) || "{}") || {};
    }
    return this._storageCache[key];
  }
  setPersistedProperty(key, value) {
    if (!this._storageCache) {
      this._storageCache = JSON.parse(this._storage.getItem(this._storageKey) || "{}") || {};
    }
    if (value === null) {
      delete this._storageCache[key];
    } else {
      this._storageCache[key] = value;
    }
    this._storage.setItem(this._storageKey, JSON.stringify(this._storageCache));
  }
  fetch(url, options) {
    return fetch(url, options);
  }
  getLibraryId() {
    return "langfuse-frontend";
  }
  getLibraryVersion() {
    return version;
  }
  getCustomUserAgent() {
    return;
  }
}

/**
 * Represents a singleton instance of the Langfuse client.
 */
class LangfuseSingleton {
  /**
   * Returns the singleton instance of the Langfuse client.
   * @param params Optional parameters for initializing the Langfuse instance. Only used for the first call.
   * @returns The singleton instance of the Langfuse client.
   */
  static getInstance(params) {
    if (!LangfuseSingleton.instance) {
      LangfuseSingleton.instance = new Langfuse(params);
    }
    return LangfuseSingleton.instance;
  }
}
LangfuseSingleton.instance = null; // Lazy initialization

const parseInputArgs = args => {
  let params = {};
  params = {
    frequency_penalty: args.frequency_penalty,
    logit_bias: args.logit_bias,
    logprobs: args.logprobs,
    max_tokens: args.max_tokens,
    n: args.n,
    presence_penalty: args.presence_penalty,
    seed: args.seed,
    stop: args.stop,
    stream: args.stream,
    temperature: args.temperature,
    top_p: args.top_p,
    user: args.user,
    response_format: args.response_format?.type,
    top_logprobs: args.top_logprobs
  };
  let input;
  if ("messages" in args) {
    input = {};
    input.messages = args.messages;
    if ("function_call" in args) {
      input.function_call = args.function_call;
    }
    if ("functions" in args) {
      input.functions = args.functions;
    }
    if ("tools" in args) {
      input.tools = args.tools;
    }
    if ("tool_choice" in args) {
      input.tool_choice = args.tool_choice;
    }
  } else {
    input = args.prompt;
  }
  return {
    model: args.model,
    input: input,
    modelParameters: params
  };
};
const parseCompletionOutput = res => {
  if (!(res instanceof Object && "choices" in res && Array.isArray(res.choices))) {
    return "";
  }
  return "message" in res.choices[0] ? res.choices[0].message : res.choices[0].text ?? "";
};
const parseUsage = res => {
  if (hasCompletionUsage(res)) {
    const {
      prompt_tokens,
      completion_tokens,
      total_tokens
    } = res.usage;
    return {
      promptTokens: prompt_tokens,
      completionTokens: completion_tokens,
      totalTokens: total_tokens
    };
  }
};
const parseChunk = rawChunk => {
  const _chunk = rawChunk;
  try {
    if ("delta" in _chunk?.choices[0]) {
      return _chunk.choices[0].delta?.content || "";
    }
    if ("text" in _chunk?.choices[0]) {
      return _chunk?.choices[0].text || "";
    }
  } catch (e) {}
  return "";
};
// Type guard to check if an unknown object is a UsageResponse
function hasCompletionUsage(obj) {
  return obj instanceof Object && "usage" in obj && obj.usage instanceof Object && typeof obj.usage.prompt_tokens === "number" && typeof obj.usage.completion_tokens === "number" && typeof obj.usage.total_tokens === "number";
}

const isAsyncIterable = x => x != null && typeof x === "object" && typeof x[Symbol.asyncIterator] === "function";

const withTracing = (tracedMethod, config) => {
  return (...args) => wrapMethod(tracedMethod, config, ...args);
};
const wrapMethod = async (tracedMethod, config, ...args) => {
  const {
    model,
    input,
    modelParameters
  } = parseInputArgs(args[0] ?? {});
  let observationData = {
    model,
    input,
    modelParameters,
    name: config?.generationName,
    startTime: new Date()
  };
  let langfuseParent;
  const hasUserProvidedParent = config && "parent" in config;
  if (hasUserProvidedParent) {
    langfuseParent = config.parent;
    // @ts-expect-error
    delete config.parent;
    observationData = {
      ...config,
      ...observationData
    };
  } else {
    const langfuse = LangfuseSingleton.getInstance(config?.clientInitParams);
    langfuseParent = langfuse.trace({
      ...config,
      ...observationData,
      id: config?.traceId,
      timestamp: observationData.startTime
    });
  }
  try {
    const res = await tracedMethod(...args);
    // Handle stream responses
    if (isAsyncIterable(res)) {
      async function* tracedOutputGenerator() {
        const response = res;
        const processedChunks = [];
        let completionStartTime = null;
        for await (const rawChunk of response) {
          completionStartTime = completionStartTime ?? new Date();
          const processedChunk = parseChunk(rawChunk);
          processedChunks.push(processedChunk);
          yield rawChunk;
        }
        const output = processedChunks.join("");
        langfuseParent.generation({
          ...observationData,
          output,
          endTime: new Date(),
          completionStartTime
        });
        if (!hasUserProvidedParent) {
          langfuseParent.update({
            output
          });
        }
      }
      return tracedOutputGenerator();
    }
    const output = parseCompletionOutput(res);
    const usage = parseUsage(res);
    langfuseParent.generation({
      ...observationData,
      output,
      endTime: new Date(),
      usage
    });
    if (!hasUserProvidedParent) {
      langfuseParent.update({
        output
      });
    }
    return res;
  } catch (error) {
    langfuseParent.generation({
      ...observationData,
      endTime: new Date(),
      statusMessage: String(error),
      level: "ERROR"
    });
    throw error;
  }
};

/**
 * Wraps an OpenAI SDK object with Langfuse tracing. Function calls are extended with a tracer that logs detailed information about the call, including the method name,
 * input parameters, and output.
 *
 * @param {T} sdk - The OpenAI SDK object to be wrapped.
 * @param {LangfuseConfig} [langfuseConfig] - Optional configuration object for the wrapper.
 * @param {string} [langfuseConfig.traceName] - The name to use for tracing. If not provided, a default name based on the SDK's constructor name and the method name will be used.
 * @param {string} [langfuseConfig.sessionId] - Optional session ID for tracing.
 * @param {string} [langfuseConfig.userId] - Optional user ID for tracing.
 * @param {string} [langfuseConfig.release] - Optional release version for tracing.
 * @param {string} [langfuseConfig.version] - Optional version for tracing.
 * @param {string} [langfuseConfig.metadata] - Optional metadata for tracing.
 * @param {string} [langfuseConfig.tags] - Optional tags for tracing.
 * @returns {T} - A proxy of the original SDK object with methods wrapped for tracing.
 *
 * @example
 * const client = new OpenAI();
 * const res = observeOpenAI(client, { traceName: "My.OpenAI.Chat.Trace" }).chat.completions.create({
 *      messages: [{ role: "system", content: "Say this is a test!" }],
        model: "gpt-3.5-turbo",
        user: "langfuse",
        max_tokens: 300
 * });
 * */
const observeOpenAI = (sdk, langfuseConfig) => {
  return new Proxy(sdk, {
    get(wrappedSdk, propKey, proxy) {
      const originalProperty = wrappedSdk[propKey];
      const defaultGenerationName = `${sdk.constructor?.name}.${propKey.toString()}`;
      const generationName = langfuseConfig?.generationName ?? defaultGenerationName;
      const config = {
        ...langfuseConfig,
        generationName
      };
      // Add a flushAsync method to the OpenAI SDK that flushes the Langfuse client
      if (propKey === "flushAsync") {
        let langfuseClient;
        // Flush the correct client depending on whether a parent client is provided
        if (langfuseConfig && "parent" in langfuseConfig) {
          langfuseClient = langfuseConfig.parent.client;
        } else {
          langfuseClient = LangfuseSingleton.getInstance();
        }
        return langfuseClient.flushAsync.bind(langfuseClient);
      }
      // Trace methods of the OpenAI SDK
      if (typeof originalProperty === "function") {
        return withTracing(originalProperty.bind(wrappedSdk), config);
      }
      const isNestedOpenAIObject = originalProperty && !Array.isArray(originalProperty) && !(originalProperty instanceof Date) && typeof originalProperty === "object";
      // Recursively wrap nested objects to ensure all nested properties or methods are also traced
      if (isNestedOpenAIObject) {
        return observeOpenAI(originalProperty, config);
      }
      // Fallback to returning the original value
      return Reflect.get(wrappedSdk, propKey, proxy);
    }
  });
};

export { Langfuse, LangfuseWeb, Langfuse as default, observeOpenAI };
//# sourceMappingURL=index.mjs.map
