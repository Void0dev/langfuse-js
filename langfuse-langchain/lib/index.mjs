import { Langfuse } from 'langfuse';
export { Langfuse } from 'langfuse';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { BaseMessage, HumanMessage, ChatMessage, AIMessage, SystemMessage, FunctionMessage, ToolMessage } from '@langchain/core/messages';

class CallbackHandler extends BaseCallbackHandler {
  constructor(params) {
    super();
    this.name = "CallbackHandler";
    this.rootProvided = false;
    this.debugEnabled = false;
    this.completionStartTimes = {};
    if (params && "root" in params) {
      this.langfuse = params.root.client;
      this.rootObservationId = params.root.observationId ?? undefined;
      this.traceId = params.root.traceId;
      this.rootProvided = true;
    } else {
      this.langfuse = new Langfuse({
        ...params,
        persistence: "memory",
        sdkIntegration: params?.sdkIntegration ?? "LANGCHAIN"
      });
      this.sessionId = params?.sessionId;
      this.userId = params?.userId;
      this.metadata = params?.metadata;
      this.tags = params?.tags;
    }
    this.version = params?.version;
  }
  async flushAsync() {
    return this.langfuse.flushAsync();
  }
  async shutdownAsync() {
    return this.langfuse.shutdownAsync();
  }
  debug(enabled = true) {
    this.langfuse.debug(enabled);
    this.debugEnabled = enabled;
  }
  _log(message) {
    if (this.debugEnabled) {
      console.log(message);
    }
  }
  async handleNewToken(_token, runId) {
    // if this is the first token, add it to completionStartTimes
    if (runId && !(runId in this.completionStartTimes)) {
      this._log(`LLM first streaming token: ${runId}`);
      this.completionStartTimes[runId] = new Date();
    }
    return Promise.resolve();
  }
  async handleLLMNewToken(token, _idx, runId, _parentRunId, _tags, _fields) {
    // if this is the first token, add it to completionStartTimes
    if (runId && !(runId in this.completionStartTimes)) {
      this._log(`LLM first streaming token: ${runId}`);
      this.completionStartTimes[runId] = new Date();
    }
    return Promise.resolve();
  }
  /**
   * @deprecated This method will be removed in a future version as it is not concurrency-safe.
   * Please use interop with the Langfuse SDK to get the trace ID ([docs](https://langfuse.com/docs/integrations/langchain/get-started#interoperability)).
   */
  getTraceId() {
    return this.traceId;
  }
  /**
   * @deprecated This method will be removed in a future version as it is not concurrency-safe.
   * For more information on how to get trace URLs, see {@link https://langfuse.com/docs/tracing/url}.
   */
  getTraceUrl() {
    return this.traceId ? `${this.langfuse.baseUrl}/trace/${this.traceId}` : undefined;
  }
  getLangchainRunId() {
    return this.topLevelObservationId;
  }
  async handleRetrieverError(err, runId, parentRunId) {
    try {
      this._log(`Retriever error: ${err} with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        level: "ERROR",
        statusMessage: err.toString(),
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, err.toString());
    } catch (e) {
      this._log(e);
    }
  }
  async handleChainStart(chain, inputs, runId, parentRunId, tags, metadata, runType, name) {
    try {
      this._log(`Chain start with Id: ${runId}`);
      this.generateTrace(chain, runId, parentRunId, tags, metadata, inputs);
      this.langfuse.span({
        id: runId,
        traceId: this.traceId,
        parentObservationId: parentRunId ?? this.rootObservationId,
        name: name ?? chain.id.at(-1)?.toString(),
        metadata: this.joinTagsAndMetaData(tags, metadata),
        input: inputs,
        version: this.version
      });
    } catch (e) {
      this._log(e);
    }
  }
  async handleAgentAction(action, runId, parentRunId) {
    try {
      this._log(`Agent action with ID: ${runId}`);
      this.langfuse.span({
        id: runId,
        parentObservationId: parentRunId,
        traceId: this.traceId,
        endTime: new Date(),
        input: action,
        version: this.version
      });
    } catch (e) {
      this._log(e);
    }
  }
  async handleAgentEnd(action, runId, parentRunId) {
    try {
      this._log(`Agent finish with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        endTime: new Date(),
        output: action,
        version: this.version
      });
      this.updateTrace(runId, parentRunId, action);
    } catch (e) {
      this._log(e);
    }
  }
  async handleChainError(err, runId, parentRunId) {
    try {
      this._log(`Chain error: ${err} with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        level: "ERROR",
        statusMessage: err.toString(),
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, err.toString());
    } catch (e) {
      this._log(e);
    }
  }
  generateTrace(serialized, runId, parentRunId, tags, metadata, input) {
    if (this.traceId && !parentRunId && !this.rootProvided) {
      this.traceId = undefined;
      this.topLevelObservationId = undefined;
    }
    if (!this.traceId) {
      this.langfuse.trace({
        id: runId,
        name: serialized.id.at(-1)?.toString(),
        metadata: this.joinTagsAndMetaData(tags, metadata, this.metadata),
        userId: this.userId,
        version: this.version,
        sessionId: this.sessionId,
        input: input,
        tags: this.tags
      });
      this.traceId = runId;
    }
    this.topLevelObservationId = parentRunId ? this.topLevelObservationId : runId;
  }
  async handleGenerationStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
    this._log(`Generation start with ID: ${runId}`);
    this.generateTrace(llm, runId, parentRunId, tags, metadata, messages);
    const modelParameters = {};
    const invocationParams = extraParams?.["invocation_params"];
    for (const [key, value] of Object.entries({
      temperature: invocationParams?.temperature,
      max_tokens: invocationParams?.max_tokens,
      top_p: invocationParams?.top_p,
      frequency_penalty: invocationParams?.frequency_penalty,
      presence_penalty: invocationParams?.presence_penalty,
      request_timeout: invocationParams?.request_timeout
    })) {
      if (value !== undefined && value !== null) {
        modelParameters[key] = value;
      }
    }
    let extractedModelName;
    if (extraParams) {
      const params = extraParams.invocation_params;
      extractedModelName = params.model;
    }
    this.langfuse.generation({
      id: runId,
      traceId: this.traceId,
      name: name ?? llm.id.at(-1)?.toString(),
      metadata: this.joinTagsAndMetaData(tags, metadata),
      parentObservationId: parentRunId ?? this.rootObservationId,
      input: messages,
      model: extractedModelName,
      modelParameters: modelParameters,
      version: this.version
    });
  }
  async handleChatModelStart(llm, messages, runId, parentRunId, extraParams, tags, metadata, name) {
    try {
      this._log(`Chat model start with ID: ${runId}`);
      const prompts = messages.flatMap(message => message.map(m => this.extractChatMessageContent(m)));
      this.handleGenerationStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name);
    } catch (e) {
      this._log(e);
    }
  }
  async handleChainEnd(outputs, runId, parentRunId) {
    try {
      this._log(`Chain end with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        output: outputs,
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, outputs);
    } catch (e) {
      this._log(e);
    }
  }
  async handleLLMStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name) {
    try {
      this._log(`LLM start with ID: ${runId}`);
      this.handleGenerationStart(llm, prompts, runId, parentRunId, extraParams, tags, metadata, name);
    } catch (e) {
      this._log(e);
    }
  }
  async handleToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
    try {
      this._log(`Tool start with ID: ${runId}`);
      this.langfuse.span({
        id: runId,
        parentObservationId: parentRunId,
        traceId: this.traceId,
        name: name ?? tool.id.at(-1)?.toString(),
        input: input,
        metadata: this.joinTagsAndMetaData(tags, metadata),
        version: this.version
      });
    } catch (e) {
      this._log(e);
    }
  }
  async handleRetrieverStart(retriever, query, runId, parentRunId, tags, metadata, name) {
    try {
      this._log(`Retriever start with ID: ${runId}`);
      this.langfuse.span({
        id: runId,
        parentObservationId: parentRunId,
        traceId: this.traceId,
        name: name ?? retriever.id.at(-1)?.toString(),
        input: query,
        metadata: this.joinTagsAndMetaData(tags, metadata),
        version: this.version
      });
    } catch (e) {
      this._log(e);
    }
  }
  async handleRetrieverEnd(documents, runId, parentRunId) {
    try {
      this._log(`Retriever end with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        output: documents,
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, documents);
    } catch (e) {
      this._log(e);
    }
  }
  async handleToolEnd(output, runId, parentRunId) {
    try {
      this._log(`Tool end with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        output: output,
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, output);
    } catch (e) {
      this._log(e);
    }
  }
  async handleToolError(err, runId, parentRunId) {
    try {
      this._log(`Tool error ${err} with ID: ${runId}`);
      this.langfuse._updateSpan({
        id: runId,
        traceId: this.traceId,
        level: "ERROR",
        statusMessage: err.toString(),
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, err.toString());
    } catch (e) {
      this._log(e);
    }
  }
  async handleLLMEnd(output, runId, parentRunId) {
    try {
      this._log(`LLM end with ID: ${runId}`);
      const lastResponse = output.generations[output.generations.length - 1][output.generations[output.generations.length - 1].length - 1];
      const llmUsage = output.llmOutput?.["tokenUsage"];
      const extractedOutput = "message" in lastResponse && lastResponse["message"] instanceof BaseMessage ? this.extractChatMessageContent(lastResponse["message"]) : lastResponse.text;
      this.langfuse._updateGeneration({
        id: runId,
        traceId: this.traceId,
        output: extractedOutput,
        endTime: new Date(),
        completionStartTime: runId in this.completionStartTimes ? this.completionStartTimes[runId] : undefined,
        usage: llmUsage,
        version: this.version
      });
      if (runId in this.completionStartTimes) {
        delete this.completionStartTimes[runId];
      }
      this.updateTrace(runId, parentRunId, extractedOutput);
    } catch (e) {
      this._log(e);
    }
  }
  extractChatMessageContent(message) {
    let response = undefined;
    if (message instanceof HumanMessage) {
      response = {
        content: message.content,
        role: "user"
      };
    } else if (message instanceof ChatMessage) {
      response = {
        content: message.content,
        role: message.name
      };
    } else if (message instanceof AIMessage) {
      response = {
        content: message.content,
        role: "assistant"
      };
    } else if (message instanceof SystemMessage) {
      response = {
        content: message.content
      };
    } else if (message instanceof FunctionMessage) {
      response = {
        content: message.content,
        additional_kwargs: message.additional_kwargs,
        role: message.name
      };
    } else if (message instanceof ToolMessage) {
      response = {
        content: message.content,
        additional_kwargs: message.additional_kwargs,
        role: message.name
      };
    } else if (!message.name) {
      response = {
        content: message.content
      };
    } else {
      response = {
        role: message.name,
        content: message.content
      };
    }
    if (message.additional_kwargs.function_call || message.additional_kwargs.tool_calls) {
      return {
        ...response,
        additional_kwargs: message.additional_kwargs
      };
    }
    return response;
  }
  async handleLLMError(err, runId, parentRunId) {
    try {
      this._log(`LLM error ${err} with ID: ${runId}`);
      this.langfuse._updateGeneration({
        id: runId,
        traceId: this.traceId,
        level: "ERROR",
        statusMessage: err.toString(),
        endTime: new Date(),
        version: this.version
      });
      this.updateTrace(runId, parentRunId, err.toString());
    } catch (e) {
      this._log(e);
    }
  }
  updateTrace(runId, parentRunId, output) {
    if (!parentRunId && this.traceId && this.traceId === runId) {
      this.langfuse.trace({
        id: this.traceId,
        output: output
      });
    }
  }
  joinTagsAndMetaData(tags, metadata1, metadata2) {
    const finalDict = {};
    if (tags && tags.length > 0) {
      finalDict.tags = tags;
    }
    if (metadata1) {
      Object.assign(finalDict, metadata1);
    }
    if (metadata2) {
      Object.assign(finalDict, metadata2);
    }
    return finalDict;
  }
}

export { CallbackHandler, CallbackHandler as default };
//# sourceMappingURL=index.mjs.map
