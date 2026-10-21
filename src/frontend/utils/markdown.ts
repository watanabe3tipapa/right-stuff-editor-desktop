import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';

// Create processor instances
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeStringify);

// const processorHtml = unified() // unused
//   .use(remarkParse)
//   .use(remarkGfm)
//   .use(remarkRehype, { allowDangerousHtml: true })
//   .use(rehypeRaw)
//   .use(rehypeStringify);

/**
 * Convert Markdown string to HTML
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return String(result);
}

/**
 * Convert Markdown string to sanitized HTML (safe for user content)
 */
export async function markdownToSafeHtml(markdown: string): Promise<string> {
  const result = await processor.process(markdown);
  return String(result);
}

/**
 * Extract plain text from Markdown (strips all formatting)
 */
export function markdownToPlainText(markdown: string): string {
  // Remove common markdown patterns
  return markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract a summary from Markdown (first N characters of plain text)
 */
export function extractSummary(markdown: string, maxLength: number = 150): string {
  const plainText = markdownToPlainText(markdown);
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.slice(0, maxLength).trim() + '...';
}

/**
 * Count words in Markdown content
 */
export function countWords(markdown: string): number {
  const plainText = markdownToPlainText(markdown);
  return plainText.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in Markdown content (excluding whitespace)
 */
export function countCharacters(markdown: string): number {
  return markdownToPlainText(markdown).replace(/\s/g, '').length;
}

/**
 * Extract headings from Markdown for table of contents
 */
export interface Heading {
  level: number;
  text: string;
  id: string;
}

export function extractHeadings(markdown: string): Heading[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Heading[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    headings.push({ level, text, id });
  }

  return headings;
}

/**
 * Validate Markdown syntax (basic validation)
 */
export interface MarkdownValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateMarkdown(markdown: string): MarkdownValidationResult {
  const errors: string[] = [];

  // Check for unclosed code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push('Unclosed code block detected');
  }

  // Check for unclosed inline code (simplified check)
  // const inlineCodeCount = (markdown.match(/`[^`]+/g) || []).length;
  // const inlineCodeCloseCount = (markdown.match(/[^`]`/g) || []).length;

  // Check for malformed links
  const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(markdown)) !== null) {
    const url = linkMatch[2];
    if (url.includes(')') && !url.match(/^https?:\/\//)) {
      errors.push(`Potentially malformed link at position ${linkMatch.index}`);
    }
  }

  // Check for unclosed brackets
  const openBrackets = (markdown.match(/\[/g) || []).length;
  const closeBrackets = (markdown.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Mismatched square brackets');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize HTML output for safe rendering
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - in production, use DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

/**
 * Apply syntax highlighting classes to code blocks
 */
export function highlightCodeBlocks(html: string): string {
  // This is a simplified version - in production, use highlight.js or Prism
  return html.replace(
    /<code class="language-(\w+)">/g,
    '<code class="language-$1 hljs">'
  );
}

/**
 * Generate a slug from text for IDs/anchors
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Convert HTML back to Markdown (basic conversion)
 */
export function htmlToMarkdown(html: string): string {
  // Basic HTML to Markdown conversion
  return html
    // Headers
    .replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '#### $1\n')
    .replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '##### $1\n')
    .replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '###### $1\n')
    // Bold
    .replace(/<strong[^>]*>([^<]+)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([^<]+)<\/b>/gi, '**$1**')
    // Italic
    .replace(/<em[^>]*>([^<]+)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([^<]+)<\/i>/gi, '*$1*')
    // Code
    .replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`')
    // Links
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)')
    // Line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Paragraphs
    .replace(/<\/p>/gi, '\n\n')
    // List items
    .replace(/<li[^>]*>([^<]+)<\/li>/gi, '- $1\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default {
  markdownToHtml,
  markdownToSafeHtml,
  markdownToPlainText,
  extractSummary,
  countWords,
  countCharacters,
  extractHeadings,
  validateMarkdown,
  sanitizeHtml,
  highlightCodeBlocks,
  slugify,
  htmlToMarkdown,
};
