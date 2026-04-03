import { describe, it, expect } from 'vitest'
import { tokenizeSentences } from './textExtractor'

describe('tokenizeSentences', () => {
  it('should split paragraphs into sentences', () => {
    const paragraphs = [
      'Hello world. This is a test.',
      'Another paragraph! Here we go.'
    ]
    
    const sentences = tokenizeSentences(paragraphs)
    
    expect(sentences).toHaveLength(4)
    expect(sentences[0].text).toEqual('Hello world.')
    expect(sentences[1].text).toEqual('This is a test.')
    expect(sentences[2].text).toEqual('Another paragraph!')
    expect(sentences[3].text).toEqual('Here we go.')
  })

  it('should assign correct indices and paragraph indices', () => {
    const paragraphs = ['First sentence. Second sentence.', 'Third sentence.']
    const sentences = tokenizeSentences(paragraphs)
    
    expect(sentences[0].index).toBe(0)
    expect(sentences[0].paragraphIndex).toBe(0)
    
    expect(sentences[1].index).toBe(1)
    expect(sentences[1].paragraphIndex).toBe(0)
    
    expect(sentences[2].index).toBe(2)
    expect(sentences[2].paragraphIndex).toBe(1)
  })

  it('should handle paragraphs without punctuation', () => {
    const paragraphs = ['Hello world', 'Just some text']
    const sentences = tokenizeSentences(paragraphs)
    
    expect(sentences).toHaveLength(2)
    expect(sentences[0].text).toEqual('Hello world')
    expect(sentences[1].text).toEqual('Just some text')
  })

  it('should assign correct word counts and start indices', () => {
    const paragraphs = ['One two three. Four five.']
    const sentences = tokenizeSentences(paragraphs)
    
    expect(sentences[0].wordCount).toBe(3)
    expect(sentences[0].wordStartIndex).toBe(0)
    
    expect(sentences[1].wordCount).toBe(2)
    expect(sentences[1].wordStartIndex).toBe(3)
  })

  it('should ignore empty paragraphs / sentences', () => {
    const paragraphs = ['  ', 'Valid sentence.  ', '   ']
    const sentences = tokenizeSentences(paragraphs)
    
    expect(sentences).toHaveLength(1)
    expect(sentences[0].text).toEqual('Valid sentence.')
  })
})
