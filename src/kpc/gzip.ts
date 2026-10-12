// gzip through the browser's (and Node's) built-in streams

export function isGzipped(data: ArrayBuffer) {
  const bytes = new Uint8Array(data)
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

export async function gunzip(data: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

export async function gzip(parts: BlobPart[]): Promise<ArrayBuffer> {
  const stream = new Blob(parts).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}
