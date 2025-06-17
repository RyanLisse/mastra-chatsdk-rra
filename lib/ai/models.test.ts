// Minimal test models to avoid import chain issues

class SimpleMockModel {
  readonly specificationVersion = 'v1' as const;
  readonly provider = 'test';
  readonly modelId = 'test-model';
  readonly defaultObjectGenerationMode = undefined;

  async doGenerate() {
    return {
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: 'stop' as const,
      usage: { promptTokens: 10, completionTokens: 20 },
      text: 'Hello, world!',
    };
  }

  async doStream() {
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: 'text-delta' as const,
            textDelta: 'Hello, world!',
          });
          controller.enqueue({
            type: 'finish' as const,
            finishReason: 'stop' as const,
            logprobs: undefined,
            usage: { completionTokens: 10, promptTokens: 3 },
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    };
  }
}

export const chatModel = new SimpleMockModel();
export const reasoningModel = new SimpleMockModel();
export const titleModel = new SimpleMockModel();
export const artifactModel = new SimpleMockModel();
