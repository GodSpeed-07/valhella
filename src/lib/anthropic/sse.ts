export interface SseEvent {
  event: string
  data: string
}

export function createSseDecoder(): (chunk: string) => SseEvent[] {
  let buffer = ''
  return (chunk: string) => {
    buffer += chunk
    const events: SseEvent[] = []
    let idx = buffer.indexOf('\n\n')
    while (idx !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      let event = 'message'
      const dataLines: string[] = []
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
      }
      if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
      idx = buffer.indexOf('\n\n')
    }
    return events
  }
}
