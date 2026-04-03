/**
 * Text Extraction Utility for epub.js
 * 
 * Extracts clean, structured text from EPUB spine sections
 * so it can be rendered natively in Vue components for fine-grained
 * DOM manipulation (typing mode, paced reading, etc.)
 */

export interface ExtractedChapter {
  /** Plain text with paragraph breaks preserved */
  plainText: string
  /** Array of paragraph strings */
  paragraphs: string[]
  /** Array of sentence tokens */
  sentences: SentenceToken[]
  /** Total word count */
  wordCount: number
  /** Total character count (excluding line breaks) */
  charCount: number
  /** Chapter title if found */
  title: string
}

export interface SentenceToken {
  text: string
  index: number
  paragraphIndex: number
  /** The index of the first word of this sentence in the total word list */
  wordStartIndex: number
  /** Number of words in this sentence */
  wordCount: number
}

/**
 * Load a spine section and extract its text content.
 * Uses epub.js Section.load() to get the raw document, 
 * then walks the DOM to extract text.
 */
export async function extractChapterText(
  book: { spine: any; load: (p: any) => Promise<any> },
  spineIndex: number
): Promise<ExtractedChapter> {
  const spine = book.spine
  if (!spine || spineIndex < 0 || spineIndex >= spine.length) {
    return { plainText: '', paragraphs: [], sentences: [], wordCount: 0, charCount: 0, title: '' }
  }

  const section = spine.get(spineIndex)
  if (!section) {
    return { plainText: '', paragraphs: [], sentences: [], wordCount: 0, charCount: 0, title: '' }
  }

  // Load the section contents — epub.js returns a Document
  const contents = await section.load(book.load.bind(book))
  
  let doc: Document
  if (contents instanceof Document) {
    doc = contents
  } else if (contents?.document) {
    doc = contents.document
  } else if (typeof contents === 'string') {
    const parser = new DOMParser()
    doc = parser.parseFromString(contents, 'text/html')
  } else {
    // Try to get the body element directly
    doc = document.implementation.createHTMLDocument('')
    if (contents?.innerHTML) {
      doc.body.innerHTML = contents.innerHTML
    }
  }

  // Extract title from heading if present
  let title = ''
  const headings = doc.querySelectorAll('h1, h2, h3')
  if (headings.length > 0) {
    title = (headings[0].textContent || '').trim()
  }

  // Extract text from block-level elements
  const blockSelectors = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th'
  const blocks = doc.querySelectorAll(blockSelectors)
  
  const paragraphs: string[] = []
  const seen = new Set<string>()

  if (blocks.length > 0) {
    blocks.forEach(block => {
      const text = cleanText(block.textContent || '')
      if (text && !seen.has(text)) {
        const childBlocks = block.querySelectorAll(blockSelectors)
        if (childBlocks.length === 0 || text !== cleanText(block.querySelector(blockSelectors)?.textContent || '')) {
          paragraphs.push(text)
          seen.add(text)
        }
      }
    })
  } else {
    const bodyText = cleanText(doc.body?.textContent || '')
    if (bodyText) {
      paragraphs.push(bodyText)
    }
  }

  const plainText = paragraphs.join('\n\n')
  const charCount = plainText.replace(/\n/g, '').length
  const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length
  const sentences = tokenizeSentences(paragraphs)

  return { plainText, paragraphs, sentences, wordCount, charCount, title }
}

function cleanText(raw: string): string {
  return raw
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export interface WordToken {
  word: string
  index: number
  paragraphIndex: number
}

export function tokenizeWords(paragraphs: string[]): WordToken[] {
  const tokens: WordToken[] = []
  let globalIndex = 0

  paragraphs.forEach((para, pIdx) => {
    const words = para.split(/\s+/).filter(w => w.length > 0)
    words.forEach(word => {
      tokens.push({ word, index: globalIndex, paragraphIndex: pIdx })
      globalIndex++
    })
  })

  return tokens
}

export type CharStatus = 'pending' | 'correct' | 'error'

export interface CharToken {
  char: string
  status: CharStatus
  index: number
  paragraphIndex: number
  isNewline: boolean
}

export function tokenizeChars(paragraphs: string[]): CharToken[] {
  const tokens: CharToken[] = []
  let globalIndex = 0

  paragraphs.forEach((para, pIdx) => {
    if (pIdx > 0) {
      tokens.push({
        char: '¶',
        status: 'pending',
        index: globalIndex,
        paragraphIndex: pIdx,
        isNewline: true,
      })
      globalIndex++
    }

    for (const char of para) {
      tokens.push({
        char,
        status: 'pending',
        index: globalIndex,
        paragraphIndex: pIdx,
        isNewline: false,
      })
      globalIndex++
    }
  })

  return tokens
}

/**
 * Split text into sentences for TTS synthesis chunks.
 */
export function tokenizeSentences(paragraphs: string[]): SentenceToken[] {
  const tokens: SentenceToken[] = []
  let sentenceGlobalIndex = 0
  let wordGlobalIndex = 0

  paragraphs.forEach((para, pIdx) => {
    // Regex to split sentences while preserving the delimiter
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g
    const matches: string[] = para.match(sentenceRegex) || []
    
    if (matches.length === 0 && para.trim().length > 0) {
      matches.push(para)
    }

    matches.forEach(match => {
      const trimmedText = match.trim()
      if (trimmedText.length === 0) return

      const words = trimmedText.split(/\s+/).filter(w => w.length > 0)
      
      tokens.push({
        text: trimmedText,
        index: sentenceGlobalIndex++,
        paragraphIndex: pIdx,
        wordStartIndex: wordGlobalIndex,
        wordCount: words.length
      })
      
      wordGlobalIndex += words.length
    })
  })

  return tokens
}
