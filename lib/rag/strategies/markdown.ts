import matter from 'gray-matter';
import { MarkdownFrontmatterSchema, type DocumentChunk } from '../validation';

export interface MarkdownProcessingOptions {
  preserveHeaders: boolean;
  extractMetadata: boolean;
  chunkByHeaders: boolean;
  chunkSize: number;
  chunkOverlap: number;
}

export interface MarkdownParseResult {
  content: string;
  frontmatter: any;
  headers: HeaderInfo[];
  metadata: any;
}

export interface HeaderInfo {
  level: number;
  text: string;
  startIndex: number;
  endIndex?: number;
}

/**
 * Advanced markdown processing strategy with frontmatter extraction
 * and header-aware chunking for RoboRail documentation
 */
export class MarkdownStrategy {
  private options: MarkdownProcessingOptions;

  constructor(options: Partial<MarkdownProcessingOptions> = {}) {
    this.options = {
      preserveHeaders: true,
      extractMetadata: true,
      chunkByHeaders: true,
      chunkSize: 512,
      chunkOverlap: 50,
      ...options
    };
  }

  /**
   * Parse markdown content with frontmatter and structure analysis
   */
  parse(content: string): MarkdownParseResult {
    try {
      // Handle RoboRail-specific format that doesn't use standard frontmatter
      const parsedContent = this.parseRoboRailFormat(content);
      
      // Extract headers for structure analysis
      const headers = this.extractHeaders(parsedContent.content);
      
      // Extract additional metadata from content
      const metadata = this.extractContentMetadata(parsedContent.content, headers);

      return {
        content: parsedContent.content,
        frontmatter: parsedContent.frontmatter,
        headers,
        metadata: {
          type: 'markdown',
          ...parsedContent.frontmatter,
          ...metadata,
          hasHeaders: headers.length > 0,
          wordCount: parsedContent.content.split(/\s+/).length,
          headerCount: headers.length,
          maxHeaderLevel: headers.length > 0 ? Math.max(...headers.map(h => h.level)) : 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse RoboRail-specific document format
   * These documents have metadata at the top but not in YAML frontmatter format
   */
  private parseRoboRailFormat(content: string): { content: string; frontmatter: any } {
    try {
      // First try standard frontmatter parsing
      const standardParsed = matter(content);
      if (standardParsed.data && Object.keys(standardParsed.data).length > 0) {
        return {
          content: standardParsed.content,
          frontmatter: standardParsed.data
        };
      }

      // If no standard frontmatter, look for RoboRail patterns
      const lines = content.split('\n');
      const frontmatter: any = {};
      let contentStartIndex = 0;

      // Look for patterns like "logo: HGG", "version 0.0 | 2-5-2024", etc.
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('<!--')) {
          continue;
        }

        // Look for key-value patterns
        if (line.includes(':') && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          
          if (key.toLowerCase().includes('logo')) {
            frontmatter.company = value;
          } else if (key.toLowerCase().includes('summary')) {
            frontmatter.description = value;
          } else {
            frontmatter[key.trim().toLowerCase()] = value;
          }
        }
        
        // Look for version patterns
        else if (line.match(/version\s+[\d.]+/i)) {
          const versionMatch = line.match(/version\s+([\d.]+)/i);
          if (versionMatch) {
            frontmatter.version = versionMatch[1];
          }
          
          // Look for date in same line
          const dateMatch = line.match(/(\d{1,2}-\d{1,2}-\d{4})/);
          if (dateMatch) {
            frontmatter.date = dateMatch[1];
          }
        }
        
        // Look for title patterns (FAQ, manual names, etc.)
        else if (line.match(/^(\*\*)?FAQ/i) || line.match(/manual/i)) {
          if (!frontmatter.title) {
            frontmatter.title = line.replace(/^\*\*|\*\*$/g, '').trim();
          }
        }
        
        // Stop when we hit the first header or significant content
        else if (line.startsWith('#') || line.length > 100) {
          contentStartIndex = i;
          break;
        }
      }

      // Extract the actual content, skipping the metadata section
      const actualContent = lines.slice(contentStartIndex).join('\n').trim();

      return {
        content: actualContent,
        frontmatter
      };
    } catch (error) {
      // Fallback to treating entire content as body with no frontmatter
      return {
        content: content,
        frontmatter: {}
      };
    }
  }

  /**
   * Extract header information from markdown content
   */
  private extractHeaders(content: string): HeaderInfo[] {
    const headers: HeaderInfo[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2].trim();
        const startIndex = content.indexOf(line);
        
        headers.push({
          level,
          text,
          startIndex
        });
      }
    }

    // Calculate end indices for each header section
    for (let i = 0; i < headers.length; i++) {
      if (i < headers.length - 1) {
        headers[i].endIndex = headers[i + 1].startIndex;
      } else {
        headers[i].endIndex = content.length;
      }
    }

    return headers;
  }

  /**
   * Extract metadata from content analysis
   */
  private extractContentMetadata(content: string, headers: HeaderInfo[]): any {
    const metadata: any = {};

    // Analyze content structure
    const lines = content.split('\n');
    metadata.lineCount = lines.length;
    
    // Look for common technical document patterns
    if (content.toLowerCase().includes('calibration')) {
      metadata.category = 'calibration';
    } else if (content.toLowerCase().includes('faq')) {
      metadata.category = 'faq'; 
    } else if (content.toLowerCase().includes('manual') || content.toLowerCase().includes('operator')) {
      metadata.category = 'manual';
    } else if (content.toLowerCase().includes('measurement')) {
      metadata.category = 'measurement';
    }

    // Extract key technical terms
    const technicalTerms = [];
    const termPatterns = [
      /roborail/gi,
      /pmac/gi,
      /calibration/gi,
      /measurement/gi,
      /chuck/gi,
      /alignment/gi,
      /sensor/gi,
      /profiling/gi
    ];

    for (const pattern of termPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        technicalTerms.push(pattern.source.replace(/[\\\/gi]/g, ''));
      }
    }

    if (technicalTerms.length > 0) {
      metadata.technicalTerms = [...new Set(technicalTerms)];
    }

    // Analyze document complexity
    const avgWordsPerLine = metadata.lineCount > 0 ? 
      content.split(/\s+/).length / metadata.lineCount : 0;
    
    metadata.complexity = avgWordsPerLine > 15 ? 'high' : 
                         avgWordsPerLine > 8 ? 'medium' : 'low';

    return metadata;
  }

  /**
   * Create chunks using header-aware strategy
   */
  chunk(parseResult: MarkdownParseResult): DocumentChunk[] {
    if (this.options.chunkByHeaders && parseResult.headers.length > 0) {
      return this.chunkByHeaders(parseResult);
    } else {
      return this.chunkBySize(parseResult);
    }
  }

  /**
   * Chunk content based on header structure
   */
  private chunkByHeaders(parseResult: MarkdownParseResult): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content, headers, metadata } = parseResult;

    // If no headers, fallback to size-based chunking
    if (headers.length === 0) {
      return this.chunkBySize(parseResult);
    }

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const nextHeader = headers[i + 1];
      
      // Extract section content
      const sectionStart = header.startIndex;
      const sectionEnd = nextHeader ? nextHeader.startIndex : content.length;
      const sectionContent = content.substring(sectionStart, sectionEnd).trim();

      // If section is too large, split it further
      if (sectionContent.length > this.options.chunkSize * 1.5) {
        const subChunks = this.splitLargeSection(sectionContent, header);
        chunks.push(...subChunks.map((chunk, subIndex) => ({
          id: `header-${i}-${subIndex}`,
          text: chunk,
          metadata: {
            ...metadata,
            chunkType: 'header-based',
            headerLevel: header.level,
            headerText: header.text,
            sectionIndex: i,
            subChunkIndex: subIndex,
            chunkLength: chunk.length
          }
        })));
      } else {
        chunks.push({
          id: `header-${i}`,
          text: sectionContent,
          metadata: {
            ...metadata,
            chunkType: 'header-based',
            headerLevel: header.level,
            headerText: header.text,
            sectionIndex: i,
            chunkLength: sectionContent.length
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Split large sections while preserving context
   */
  private splitLargeSection(content: string, header: HeaderInfo): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';
    let currentSize = 0;

    // Always start with the header
    const headerLine = lines[0];
    currentChunk = headerLine + '\n';
    currentSize = headerLine.length;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const lineWithBreak = line + '\n';
      
      // Check if adding this line would exceed chunk size
      if (currentSize + lineWithBreak.length > this.options.chunkSize) {
        // Only create chunk if it has substantial content
        if (currentChunk.trim().length > 50) {
          chunks.push(currentChunk.trim());
        }
        
        // Start new chunk with context (header + overlap)
        const overlapLines = this.getOverlapLines(lines, i);
        currentChunk = headerLine + '\n' + overlapLines.join('\n') + '\n' + lineWithBreak;
        currentSize = currentChunk.length;
      } else {
        currentChunk += lineWithBreak;
        currentSize += lineWithBreak.length;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 50) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Get overlap lines for context preservation
   */
  private getOverlapLines(lines: string[], currentIndex: number): string[] {
    const overlapWords = this.options.chunkOverlap;
    const overlapLines: string[] = [];
    let wordCount = 0;
    
    // Go backwards to get context
    for (let i = currentIndex - 1; i >= 0 && wordCount < overlapWords; i--) {
      const line = lines[i];
      const wordsInLine = line.split(/\s+/).length;
      
      if (wordCount + wordsInLine <= overlapWords) {
        overlapLines.unshift(line);
        wordCount += wordsInLine;
      } else {
        break;
      }
    }
    
    return overlapLines;
  }

  /**
   * Chunk content by size when header-based chunking is not suitable
   */
  private chunkBySize(parseResult: MarkdownParseResult): DocumentChunk[] {
    const { content, metadata } = parseResult;
    const chunks: string[] = [];
    
    if (content.length <= this.options.chunkSize) {
      return [{
        id: 'chunk-0',
        text: content,
        metadata: {
          ...metadata,
          chunkType: 'size-based',
          chunkIndex: 0,
          chunkLength: content.length
        }
      }];
    }

    let start = 0;
    let chunkIndex = 0;

    while (start < content.length) {
      const end = Math.min(start + this.options.chunkSize, content.length);
      let chunk = content.substring(start, end);
      let actualEnd = end;
      
      // Try to break at sentence boundaries
      if (end < content.length && !chunk.match(/[.!?]\s*$/)) {
        const lastSentenceEnd = Math.max(
          chunk.lastIndexOf('.'),
          chunk.lastIndexOf('!'),
          chunk.lastIndexOf('?')
        );
        
        if (lastSentenceEnd > chunk.length * 0.5) {
          chunk = chunk.substring(0, lastSentenceEnd + 1);
          actualEnd = start + lastSentenceEnd + 1;
        }
      }
      
      chunks.push(chunk.trim());
      
      // Move start position accounting for overlap
      const nextStart = Math.max(actualEnd - this.options.chunkOverlap, start + 1);
      start = nextStart;
      if (start >= content.length) break;
      chunkIndex++;
    }

    return chunks
      .filter(chunk => chunk.length > 0)
      .map((chunk, index) => ({
        id: `chunk-${index}`,
        text: chunk,
        metadata: {
          ...metadata,
          chunkType: 'size-based',
          chunkIndex: index,
          chunkLength: chunk.length
        }
      }));
  }
}