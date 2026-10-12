import { KPC_FLAG_COLOR, KPC_FRAME_HEADER_BYTES, KPC_HEADER_BYTES, KPC_MAGIC, KPC_UNITS_PER_METER, KPC_VERSION, KpcFrame } from './kpcTypes'
import { gzip } from './gzip'

export function encodeHeader(fps: number, hasColor: boolean): ArrayBuffer {
  const buffer = new ArrayBuffer(KPC_HEADER_BYTES)
  const view = new DataView(buffer)
  view.setUint32(0, KPC_MAGIC, true)
  view.setUint8(4, KPC_VERSION)
  view.setUint8(5, hasColor ? KPC_FLAG_COLOR : 0)
  view.setUint16(6, Math.round(fps), true)
  view.setFloat32(8, KPC_UNITS_PER_METER, true)
  view.setUint32(12, 0, true)
  return buffer
}

// One frame, padded to 4 bytes so the player can read the frames in place
export function encodeFrame(frame: KpcFrame, hasColor: boolean): ArrayBuffer {
  const count = frame.positions.length / 3
  const bytes = KPC_FRAME_HEADER_BYTES + count * (hasColor ? 9 : 6)
  const buffer = new ArrayBuffer(Math.ceil(bytes / 4) * 4)
  const view = new DataView(buffer)
  view.setUint32(0, Math.round(frame.time * 1000), true)
  view.setUint32(4, count, true)
  new Int16Array(buffer, KPC_FRAME_HEADER_BYTES, count * 3).set(frame.positions)
  if (hasColor) {
    const colors = new Uint8Array(buffer, KPC_FRAME_HEADER_BYTES + count * 6, count * 3)
    if (frame.colors) {
      colors.set(frame.colors)
    } else {
      colors.fill(255)
    }
  }
  return buffer
}

// The whole file, gzipped
export async function encodeKpc(frames: KpcFrame[], fps: number, hasColor: boolean): Promise<ArrayBuffer> {
  const parts: BlobPart[] = [encodeHeader(fps, hasColor)]
  for (const frame of frames) {
    parts.push(encodeFrame(frame, hasColor))
  }
  return gzip(parts)
}
