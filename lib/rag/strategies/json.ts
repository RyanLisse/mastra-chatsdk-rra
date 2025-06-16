import type { DocumentChunk } from '../validation';

export interface JSONProcessingOptions {
  preserveStructure: boolean;
  chunkSize: number;
  chunkOverlap: number;
  groupRelatedItems: boolean;
  extractMetadata: boolean;
  maxDepth: number;
}

export interface JSONParseResult {
  structure: any;
  content: string;
  metadata: any;
  schema: JSONSchemaInfo;
}

export interface JSONSchemaInfo {
  type: 'faq' | 'documentation' | 'configuration' | 'dataset' | 'generic';
  properties: string[];
  depth: number;
  itemCount: number;
  relationships: string[];
}

/**
 * Advanced JSON processing strategy with structure-aware chunking
 * Specialized for RoboRail FAQ and documentation JSON formats
 */
export class JSONStrategy {
  private options: JSONProcessingOptions;

  constructor(options: Partial<JSONProcessingOptions> = {}) {
    this.options = {
      preserveStructure: true,
      chunkSize: 512,
      chunkOverlap: 50,
      groupRelatedItems: true,
      extractMetadata: true,
      maxDepth: 5,
      ...options,
    };
  }

  /**
   * Parse JSON content with structure analysis
   */
  parse(content: string): JSONParseResult {
    try {
      const structure = JSON.parse(content);
      const schema = this.analyzeSchema(structure);
      const textContent = this.extractTextContent(structure, schema);
      const metadata = this.extractMetadata(structure, schema);

      return {
        structure,
        content: textContent,
        metadata: {
          type: 'json',
          ...metadata,
          wordCount: textContent.split(/\s+/).length,
        },
        schema,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Analyze JSON schema and structure
   */
  private analyzeSchema(data: any): JSONSchemaInfo {
    const properties: string[] = [];
    let depth = 0;
    let itemCount = 0;
    const relationships: string[] = [];

    // Detect schema type based on structure
    let type: JSONSchemaInfo['type'] = 'generic';

    if (Array.isArray(data)) {
      itemCount = data.length;

      // Check if it's a FAQ dataset
      if (data.length > 0 && data[0].question && data[0].answer) {
        type = 'faq';
        properties.push('question', 'answer');

        // Look for additional FAQ properties
        const firstItem = data[0];
        Object.keys(firstItem).forEach((key) => {
          if (!properties.includes(key)) {
            properties.push(key);
          }
        });

        // Analyze relationships (chunk_ids, categories, etc.)
        if (firstItem.chunk_id) {
          relationships.push('chunk_reference');
        }
        if (firstItem.category) {
          relationships.push('category_grouping');
        }
      }

      // Calculate maximum depth
      depth = this.calculateDepth(data);
    } else if (typeof data === 'object' && data !== null) {
      properties.push(...Object.keys(data));
      depth = this.calculateDepth(data);
      itemCount = 1;

      // Detect documentation or configuration types
      if (data.title || data.sections) {
        type = 'documentation';
      } else if (data.config || data.settings) {
        type = 'configuration';
      }
    }

    return {
      type,
      properties,
      depth,
      itemCount,
      relationships,
    };
  }

  /**
   * Calculate maximum depth of nested structure
   */
  private calculateDepth(obj: any, currentDepth = 0): number {
    if (currentDepth >= this.options.maxDepth) {
      return currentDepth;
    }

    if (Array.isArray(obj)) {
      let maxDepth = currentDepth;
      for (const item of obj) {
        const itemDepth = this.calculateDepth(item, currentDepth + 1);
        maxDepth = Math.max(maxDepth, itemDepth);
      }
      return maxDepth;
    } else if (typeof obj === 'object' && obj !== null) {
      let maxDepth = currentDepth;
      for (const value of Object.values(obj)) {
        const valueDepth = this.calculateDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, valueDepth);
      }
      return maxDepth;
    }

    return currentDepth;
  }

  /**
   * Extract readable text content from JSON structure
   */
  private extractTextContent(data: any, schema: JSONSchemaInfo): string {
    switch (schema.type) {
      case 'faq':
        return this.extractFAQContent(data);
      case 'documentation':
        return this.extractDocumentationContent(data);
      default:
        return this.extractGenericContent(data);
    }
  }

  /**
   * Extract content from FAQ structure
   */
  private extractFAQContent(data: any[]): string {
    return data
      .map((item, index) => {
        const parts = [`Q${index + 1}: ${item.question}`];

        if (item.answer) {
          parts.push(`A${index + 1}: ${item.answer}`);
        }

        // Add additional context if available
        if (item.category) {
          parts.push(`Category: ${item.category}`);
        }
        if (item.tags) {
          parts.push(
            `Tags: ${Array.isArray(item.tags) ? item.tags.join(', ') : item.tags}`,
          );
        }

        return parts.join('\n');
      })
      .join('\n\n---\n\n');
  }

  /**
   * Extract content from documentation structure
   */
  private extractDocumentationContent(data: any): string {
    const parts: string[] = [];

    if (data.title) {
      parts.push(`# ${data.title}`);
    }

    if (data.description) {
      parts.push(data.description);
    }

    if (data.sections) {
      if (Array.isArray(data.sections)) {
        data.sections.forEach((section: any, index: number) => {
          parts.push(`## Section ${index + 1}: ${section.title || 'Untitled'}`);
          if (section.content) {
            parts.push(section.content);
          }
        });
      }
    }

    if (data.content) {
      parts.push(data.content);
    }

    return parts.join('\n\n');
  }

  /**
   * Extract content from generic JSON structure
   */
  private extractGenericContent(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Extract metadata from JSON structure
   */
  private extractMetadata(data: any, schema: JSONSchemaInfo): any {
    const metadata: any = {
      jsonType: schema.type,
      properties: schema.properties,
      depth: schema.depth,
      itemCount: schema.itemCount,
      relationships: schema.relationships,
    };

    // Extract specific metadata based on schema type
    switch (schema.type) {
      case 'faq':
        metadata.questionCount = Array.isArray(data) ? data.length : 0;
        metadata.categories = this.extractCategories(data);
        metadata.averageQuestionLength = this.calculateAverageLength(
          data,
          'question',
        );
        metadata.averageAnswerLength = this.calculateAverageLength(
          data,
          'answer',
        );
        break;

      case 'documentation':
        if (data.title) metadata.title = data.title;
        if (data.version) metadata.version = data.version;
        if (data.author) metadata.author = data.author;
        break;
    }

    return metadata;
  }

  /**
   * Extract categories from FAQ data
   */
  private extractCategories(data: any[]): string[] {
    if (!Array.isArray(data)) return [];

    const categories = new Set<string>();
    data.forEach((item) => {
      if (item.category) {
        categories.add(item.category);
      }
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => categories.add(tag));
      }
    });

    return Array.from(categories);
  }

  /**
   * Calculate average length of a specific field
   */
  private calculateAverageLength(data: any[], field: string): number {
    if (!Array.isArray(data)) return 0;

    const lengths = data
      .filter((item) => item[field])
      .map((item) => item[field].length);

    return lengths.length > 0
      ? Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length)
      : 0;
  }

  /**
   * Create chunks using structure-aware strategy
   */
  chunk(parseResult: JSONParseResult): DocumentChunk[] {
    switch (parseResult.schema.type) {
      case 'faq':
        return this.chunkFAQData(parseResult);
      case 'documentation':
        return this.chunkDocumentation(parseResult);
      default:
        return this.chunkGeneric(parseResult);
    }
  }

  /**
   * Chunk FAQ data preserving question-answer pairs
   */
  private chunkFAQData(parseResult: JSONParseResult): DocumentChunk[] {
    const { structure, metadata, schema } = parseResult;

    if (!Array.isArray(structure)) {
      throw new Error('FAQ data must be an array');
    }

    const chunks: DocumentChunk[] = [];

    if (this.options.groupRelatedItems) {
      // Group related FAQ items by category or theme
      const groups = this.groupFAQItems(structure);

      groups.forEach((group, groupIndex) => {
        const groupText = group
          .map(
            (item, itemIndex) =>
              `Q: ${item.question}\nA: ${item.answer}${item.category ? `\nCategory: ${item.category}` : ''}`,
          )
          .join('\n\n');

        // Split group if too large
        if (groupText.length > this.options.chunkSize * 1.5) {
          const subChunks = this.splitFAQGroup(group);
          subChunks.forEach((subChunk, subIndex) => {
            chunks.push({
              id: `faq-group-${groupIndex}-${subIndex}`,
              text: subChunk,
              metadata: {
                ...metadata,
                chunkType: 'faq-group',
                groupIndex,
                subChunkIndex: subIndex,
                itemCount: this.countQuestionsInText(subChunk),
                chunkLength: subChunk.length,
              },
            });
          });
        } else {
          chunks.push({
            id: `faq-group-${groupIndex}`,
            text: groupText,
            metadata: {
              ...metadata,
              chunkType: 'faq-group',
              groupIndex,
              itemCount: group.length,
              chunkLength: groupText.length,
              category: group[0]?.category || 'general',
            },
          });
        }
      });
    } else {
      // Process individual FAQ items
      structure.forEach((item: any, index: number) => {
        const itemText = `Q: ${item.question}\nA: ${item.answer}${item.category ? `\nCategory: ${item.category}` : ''}`;

        chunks.push({
          id: `faq-item-${index}`,
          text: itemText,
          metadata: {
            ...metadata,
            chunkType: 'faq-item',
            itemIndex: index,
            category: item.category || 'general',
            originalChunkId: item.chunk_id,
            chunkLength: itemText.length,
          },
        });
      });
    }

    return chunks;
  }

  /**
   * Group FAQ items by category or related themes
   */
  private groupFAQItems(items: any[]): any[][] {
    const groups: { [key: string]: any[] } = {};

    items.forEach((item) => {
      const category = item.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    // Also group by chunk_id if available (items from same source)
    const chunkGroups: { [key: string]: any[] } = {};
    items.forEach((item) => {
      if (item.chunk_id) {
        if (!chunkGroups[item.chunk_id]) {
          chunkGroups[item.chunk_id] = [];
        }
        chunkGroups[item.chunk_id].push(item);
      }
    });

    // Use the grouping strategy that results in more balanced groups
    const categoryGroupValues = Object.values(groups);
    const chunkGroupValues = Object.values(chunkGroups);

    // Choose the grouping method that creates more balanced groups
    if (
      chunkGroupValues.length > 0 &&
      this.isMoreBalanced(chunkGroupValues, categoryGroupValues)
    ) {
      return chunkGroupValues;
    }

    return categoryGroupValues;
  }

  /**
   * Check if one grouping is more balanced than another
   */
  private isMoreBalanced(groups1: any[][], groups2: any[][]): boolean {
    const variance1 = this.calculateGroupSizeVariance(groups1);
    const variance2 = this.calculateGroupSizeVariance(groups2);
    return variance1 < variance2;
  }

  /**
   * Calculate variance in group sizes
   */
  private calculateGroupSizeVariance(groups: any[][]): number {
    const sizes = groups.map((g) => g.length);
    const mean = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const variance =
      sizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) /
      sizes.length;
    return variance;
  }

  /**
   * Split large FAQ groups into smaller chunks
   */
  private splitFAQGroup(group: any[]): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    let currentSize = 0;

    for (const item of group) {
      const itemText = `Q: ${item.question}\nA: ${item.answer}${item.category ? `\nCategory: ${item.category}` : ''}\n\n`;

      // Check if adding this item would exceed chunk size
      if (currentSize + itemText.length > this.options.chunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = itemText;
        currentSize = itemText.length;
      } else {
        currentChunk += itemText;
        currentSize += itemText.length;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0
      ? chunks
      : [
          group
            .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
            .join('\n\n'),
        ];
  }

  /**
   * Count questions in text chunk
   */
  private countQuestionsInText(text: string): number {
    const matches = text.match(/^Q:/gm);
    return matches ? matches.length : 0;
  }

  /**
   * Chunk documentation-style JSON
   */
  private chunkDocumentation(parseResult: JSONParseResult): DocumentChunk[] {
    const { content, metadata } = parseResult;

    // Use simple size-based chunking for documentation
    return this.chunkBySize(content, metadata, 'documentation');
  }

  /**
   * Chunk generic JSON content
   */
  private chunkGeneric(parseResult: JSONParseResult): DocumentChunk[] {
    const { content, metadata } = parseResult;

    return this.chunkBySize(content, metadata, 'generic');
  }

  /**
   * Size-based chunking fallback
   */
  private chunkBySize(
    content: string,
    metadata: any,
    chunkType: string,
  ): DocumentChunk[] {
    const chunks: string[] = [];

    if (content.length <= this.options.chunkSize) {
      return [
        {
          id: 'chunk-0',
          text: content,
          metadata: {
            ...metadata,
            chunkType: `${chunkType}-single`,
            chunkIndex: 0,
            chunkLength: content.length,
          },
        },
      ];
    }

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + this.options.chunkSize, content.length);
      let chunk = content.substring(start, end);
      let actualEnd = end;

      // Try to break at natural boundaries for JSON-derived text
      if (end < content.length) {
        const lastNewline = chunk.lastIndexOf('\n');
        const lastSentence = Math.max(
          chunk.lastIndexOf('.'),
          chunk.lastIndexOf('!'),
          chunk.lastIndexOf('?'),
        );

        const breakPoint = Math.max(lastNewline, lastSentence);
        if (breakPoint > chunk.length * 0.5) {
          chunk = chunk.substring(0, breakPoint + 1);
          actualEnd = start + breakPoint + 1;
        }
      }

      chunks.push(chunk.trim());

      // Move start position accounting for overlap
      const nextStart = Math.max(
        actualEnd - this.options.chunkOverlap,
        start + 1,
      );
      start = nextStart;
      if (start >= content.length) break;
      chunkIndex++;
    }

    return chunks
      .filter((chunk) => chunk.length > 0)
      .map((chunk, index) => ({
        id: `${chunkType}-chunk-${index}`,
        text: chunk,
        metadata: {
          ...metadata,
          chunkType: `${chunkType}-size`,
          chunkIndex: index,
          chunkLength: chunk.length,
        },
      }));
  }
}
