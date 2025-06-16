import { ragTool } from '../../lib/ai/tools/rag';
import { roboRailPrompt } from '../../lib/ai/prompts';
import { describe, expect, test } from 'bun:test';

describe('RoboRail RAG Integration', () => {
  test('should have the correct system prompt', () => {
    // Test that the prompt is properly configured
    expect(roboRailPrompt).toBeDefined();
    expect(roboRailPrompt).toContain('RoboRail Assistant');
    expect(roboRailPrompt).toContain('HGG Profiling Equipment');
    expect(roboRailPrompt).toContain('safety');
    expect(roboRailPrompt).toContain('ragTool');
  });

  test('should have a properly configured RAG tool', () => {
    // Test that the RAG tool is properly structured
    expect(ragTool).toBeDefined();
    expect(typeof ragTool).toBe('object');

    // The tool should have execute function
    expect(ragTool.execute).toBeInstanceOf(Function);
  });

  test('should have proper RAG tool structure for AI SDK', () => {
    // Test that the tool is properly exported and has expected structure
    expect(ragTool).toBeDefined();

    // Check that it's a valid AI SDK tool object
    expect(ragTool.execute).toBeInstanceOf(Function);
    expect(ragTool.description).toBeDefined();
    expect(ragTool.parameters).toBeDefined();

    // Test that the description mentions RoboRail
    expect(ragTool.description).toContain('RoboRail');
    expect(ragTool.description).toContain('technical documentation');
  });

  test('should validate RAG tool parameters correctly', () => {
    // Test the schema validation
    const validInput = { query: 'How do I start the machine?' };
    const result = ragTool.parameters.safeParse(validInput);
    expect(result.success).toBe(true);

    const invalidInput = { notQuery: 'invalid' };
    const invalidResult = ragTool.parameters.safeParse(invalidInput);
    expect(invalidResult.success).toBe(false);
  });
});
