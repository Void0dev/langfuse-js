import { LangfuseCoreOptions, LangfuseCore, LangfusePersistedProperty, LangfuseFetchOptions, LangfuseFetchResponse, LangfuseWebStateless, LangfuseTraceClient, LangfuseSpanClient, LangfuseGenerationClient, CreateLangfuseTraceBody, CreateLangfuseGenerationBody } from 'langfuse-core';
export { LangfuseEventClient, LangfuseGenerationClient, LangfuseSpanClient, LangfuseTraceClient } from 'langfuse-core';
import OpenAI from 'openai';

type LangfuseOptions = {
    persistence?: "localStorage" | "sessionStorage" | "cookie" | "memory";
    persistence_name?: string;
} & LangfuseCoreOptions;

declare class Langfuse extends LangfuseCore {
    private _storage;
    private _storageCache;
    private _storageKey;
    constructor(params?: {
        publicKey?: string;
        secretKey?: string;
    } & LangfuseOptions);
    getPersistedProperty<T>(key: LangfusePersistedProperty): T | undefined;
    setPersistedProperty<T>(key: LangfusePersistedProperty, value: T | null): void;
    fetch(url: string, options: LangfuseFetchOptions): Promise<LangfuseFetchResponse>;
    getLibraryId(): string;
    getLibraryVersion(): string;
    getCustomUserAgent(): void;
}
declare class LangfuseWeb extends LangfuseWebStateless {
    private _storage;
    private _storageCache;
    private _storageKey;
    constructor(params?: {
        publicKey?: string;
    } & LangfuseOptions);
    getPersistedProperty<T>(key: LangfusePersistedProperty): T | undefined;
    setPersistedProperty<T>(key: LangfusePersistedProperty, value: T | null): void;
    fetch(url: string, options: LangfuseFetchOptions): Promise<LangfuseFetchResponse>;
    getLibraryId(): string;
    getLibraryVersion(): string;
    getCustomUserAgent(): void;
}

/**
 * Represents a singleton instance of the Langfuse client.
 */
declare class LangfuseSingleton {
    private static instance;
    /**
     * Returns the singleton instance of the Langfuse client.
     * @param params Optional parameters for initializing the Langfuse instance. Only used for the first call.
     * @returns The singleton instance of the Langfuse client.
     */
    static getInstance(params?: LangfuseInitParams): Langfuse;
}

type LangfuseInitParams = {
    publicKey?: string;
    secretKey?: string;
} & LangfuseCoreOptions;
type LangfuseTraceConfig = Pick<CreateLangfuseTraceBody, "sessionId" | "userId" | "release" | "version" | "metadata" | "tags">;
type LangfuseGenerationConfig = Pick<CreateLangfuseGenerationBody, "metadata" | "version" | "promptName" | "promptVersion">;
type LangfuseNewTraceConfig = LangfuseTraceConfig & {
    traceId?: string;
    clientInitParams?: LangfuseInitParams;
};
type LangfuseParent = LangfuseTraceClient | LangfuseSpanClient | LangfuseGenerationClient;
type LangfuseWithParentConfig = LangfuseGenerationConfig & {
    parent: LangfuseParent;
};
type LangfuseConfig = (LangfuseNewTraceConfig | LangfuseWithParentConfig) & {
    generationName?: string;
};
type LangfuseExtension = OpenAI & Pick<ReturnType<typeof LangfuseSingleton.getInstance>, "flushAsync">;

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
declare const observeOpenAI: <SDKType extends object>(sdk: SDKType, langfuseConfig?: LangfuseConfig) => SDKType & LangfuseExtension;

export { Langfuse, type LangfuseConfig, type LangfuseOptions, type LangfuseParent, LangfuseWeb, Langfuse as default, observeOpenAI };
