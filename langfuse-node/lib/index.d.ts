import { LangfuseCoreOptions, LangfuseFetchOptions, LangfuseFetchResponse, LangfuseCore, LangfusePersistedProperty } from 'langfuse-core';
export { LangfuseEventClient, LangfuseGenerationClient, LangfuseSpanClient, LangfuseTraceClient } from 'langfuse-core';

type LangfuseOptions = LangfuseCoreOptions & {
    persistence?: "memory";
    requestTimeout?: number;
    fetch?: (url: string, options: LangfuseFetchOptions) => Promise<LangfuseFetchResponse>;
};

declare class Langfuse extends LangfuseCore {
    private _memoryStorage;
    private options;
    constructor(params?: {
        publicKey?: string;
        secretKey?: string;
    } & LangfuseOptions);
    getPersistedProperty(key: LangfusePersistedProperty): any | undefined;
    setPersistedProperty(key: LangfusePersistedProperty, value: any | null): void;
    fetch(url: string, options: LangfuseFetchOptions): Promise<LangfuseFetchResponse>;
    getLibraryId(): string;
    getLibraryVersion(): string;
    getCustomUserAgent(): string;
}

export { Langfuse, Langfuse as default };
