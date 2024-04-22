import { Langfuse, LangfuseOptions } from 'langfuse';
export { Langfuse } from 'langfuse';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { BaseMessageFields, BaseMessage, MessageContent } from '@langchain/core/messages';
import { Serialized } from '@langchain/core/load/serializable';
import { AgentAction, AgentFinish } from '@langchain/core/agents';
import { ChainValues } from '@langchain/core/utils/types';
import { LLMResult } from '@langchain/core/outputs';
import { Document } from '@langchain/core/documents';
import { LangfuseTraceClient, LangfuseSpanClient } from 'langfuse-core';

type LlmMessage = {
    role: string;
    content: BaseMessageFields["content"];
    additional_kwargs?: BaseMessageFields["additional_kwargs"];
};
type AnonymousLlmMessage = {
    content: BaseMessageFields["content"];
    additional_kwargs?: BaseMessageFields["additional_kwargs"];
};
type RootParams = {
    root: LangfuseTraceClient | LangfuseSpanClient;
};
type KeyParams = {
    publicKey?: string;
    secretKey?: string;
} & LangfuseOptions;
type ConstructorParams = (RootParams | KeyParams) & {
    userId?: string;
    version?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
};
declare class CallbackHandler extends BaseCallbackHandler {
    name: string;
    langfuse: Langfuse;
    traceId?: string;
    observationId?: string;
    rootObservationId?: string;
    topLevelObservationId?: string;
    userId?: string;
    version?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    rootProvided: boolean;
    debugEnabled: boolean;
    completionStartTimes: Record<string, Date>;
    constructor(params?: ConstructorParams);
    flushAsync(): Promise<any>;
    shutdownAsync(): Promise<any>;
    debug(enabled?: boolean): void;
    _log(message: any): void;
    handleNewToken(_token: string, runId: string): Promise<void>;
    handleLLMNewToken(token: string, _idx: any, runId: string, _parentRunId?: string, _tags?: string[], _fields?: any): Promise<void>;
    /**
     * @deprecated This method will be removed in a future version as it is not concurrency-safe.
     * Please use interop with the Langfuse SDK to get the trace ID ([docs](https://langfuse.com/docs/integrations/langchain/get-started#interoperability)).
     */
    getTraceId(): string | undefined;
    /**
     * @deprecated This method will be removed in a future version as it is not concurrency-safe.
     * For more information on how to get trace URLs, see {@link https://langfuse.com/docs/tracing/url}.
     */
    getTraceUrl(): string | undefined;
    getLangchainRunId(): string | undefined;
    handleRetrieverError(err: any, runId: string, parentRunId?: string | undefined): Promise<void>;
    handleChainStart(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runType?: string, name?: string): Promise<void>;
    handleAgentAction(action: AgentAction, runId?: string, parentRunId?: string): Promise<void>;
    handleAgentEnd?(action: AgentFinish, runId: string, parentRunId?: string): Promise<void>;
    handleChainError(err: any, runId: string, parentRunId?: string | undefined): Promise<void>;
    generateTrace(serialized: Serialized, runId: string, parentRunId: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, input?: string | BaseMessage[][] | ChainValues): void;
    handleGenerationStart(llm: Serialized, messages: (LlmMessage | MessageContent | AnonymousLlmMessage)[], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string): Promise<void>;
    handleChatModelStart(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string): Promise<void>;
    handleChainEnd(outputs: ChainValues, runId: string, parentRunId?: string | undefined): Promise<void>;
    handleLLMStart(llm: Serialized, prompts: string[], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string): Promise<void>;
    handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string): Promise<void>;
    handleRetrieverStart(retriever: Serialized, query: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string): Promise<void>;
    handleRetrieverEnd(documents: Document<Record<string, any>>[], runId: string, parentRunId?: string | undefined): Promise<void>;
    handleToolEnd(output: string, runId: string, parentRunId?: string | undefined): Promise<void>;
    handleToolError(err: any, runId: string, parentRunId?: string | undefined): Promise<void>;
    handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string | undefined): Promise<void>;
    private extractChatMessageContent;
    handleLLMError(err: any, runId: string, parentRunId?: string | undefined): Promise<void>;
    updateTrace(runId: string, parentRunId: string | undefined, output: any): void;
    joinTagsAndMetaData(tags?: string[] | undefined, metadata1?: Record<string, unknown> | undefined, metadata2?: Record<string, unknown> | undefined): Record<string, unknown>;
}

export { type AnonymousLlmMessage, CallbackHandler, type LlmMessage, CallbackHandler as default };
