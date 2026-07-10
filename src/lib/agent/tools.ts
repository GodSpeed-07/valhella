import type { ToolDefinition } from '../anthropic/types'

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'read_page',
    description:
      'Read the current page: returns an indexed snapshot of interactive elements like [12] button "Add to cart", plus a heading outline. Element ids are only valid until the page changes.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'screenshot',
    description:
      'Take a screenshot of the visible part of the page. Use it to visually verify layouts, images, or states the snapshot cannot convey.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'click',
    description: 'Click an element by its snapshot id.',
    input_schema: {
      type: 'object',
      properties: { element_id: { type: 'integer', description: 'Id from the latest snapshot' } },
      required: ['element_id'],
      additionalProperties: false
    }
  },
  {
    name: 'type_text',
    description: 'Type into an input, textarea, or editable element by its snapshot id. Replaces its current value.',
    input_schema: {
      type: 'object',
      properties: {
        element_id: { type: 'integer' },
        text: { type: 'string' },
        press_enter: { type: 'boolean', description: 'Press Enter after typing' }
      },
      required: ['element_id', 'text'],
      additionalProperties: false
    }
  },
  {
    name: 'select_option',
    description: 'Choose an option in a select element by its snapshot id. Value may be the option value or its label.',
    input_schema: {
      type: 'object',
      properties: { element_id: { type: 'integer' }, value: { type: 'string' } },
      required: ['element_id', 'value'],
      additionalProperties: false
    }
  },
  {
    name: 'scroll',
    description: 'Scroll the page up or down by most of a viewport, or scroll a specific element into view.',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'] },
        element_id: { type: 'integer', description: 'Scroll this element into view instead' }
      },
      additionalProperties: false
    }
  },
  {
    name: 'navigate',
    description: 'Navigate the current tab to a URL.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false
    }
  },
  {
    name: 'go_back',
    description: 'Go back one step in the tab history.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'wait',
    description: 'Wait up to 5 seconds for the page to settle or content to load.',
    input_schema: {
      type: 'object',
      properties: { seconds: { type: 'number', minimum: 0, maximum: 5 } },
      required: ['seconds'],
      additionalProperties: false
    }
  },
  {
    name: 'list_tabs',
    description: 'List the open tabs in this window with their ids, titles, and URLs.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'open_tab',
    description: 'Open a URL in a new tab and make it the working tab.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
      additionalProperties: false
    }
  },
  {
    name: 'switch_tab',
    description: 'Switch to another open tab by id (from list_tabs) and make it the working tab.',
    input_schema: {
      type: 'object',
      properties: { tab_id: { type: 'integer' } },
      required: ['tab_id'],
      additionalProperties: false
    }
  }
]
