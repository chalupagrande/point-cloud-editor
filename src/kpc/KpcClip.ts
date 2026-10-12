import { KPC_FLAG_COLOR, KPC_FRAME_HEADER_BYTES, KPC_HEADER_BYTES, KPC_MAGIC, KpcFrame, KpcHeader } from './kpcTypes'
import { gunzip, isGzipped } from './gzip'

type FrameIndex = {
  time: number
  count: number
  offset: number // byte offset of the positions in the buffer
}

// A parsed .kpc recording. Frames are read in place from the decompressed buffer.
export class KpcClip {
  readonly header: KpcHeader
  readonly frameCount: number
  readonly duration: number // seconds, the last frame stays up for one average frame interval
  readonly maxPointCount: number
  readonly byteLength: number
  private readonly buffer: ArrayBuffer
  private readonly frames: FrameIndex[] = []

  constructor(buffer: ArrayBuffer) {
    const view = new DataView(buffer)
    if (buffer.byteLength < KPC_HEADER_BYTES || view.getUint32(0, true) !== KPC_MAGIC) {
      throw new Error('Not a .kpc point cloud recording')
    }
    this.buffer = buffer
    this.byteLength = buffer.byteLength
    this.header = {
      version: view.getUint8(4),
      hasColor: (view.getUint8(5) & KPC_FLAG_COLOR) !== 0,
      fps: view.getUint16(6, true),
      unitsPerMeter: view.getFloat32(8, true),
    }

    const bytesPerPoint = this.header.hasColor ? 9 : 6
    let maxCount = 0
    let offset = KPC_HEADER_BYTES
    while (offset + KPC_FRAME_HEADER_BYTES <= buffer.byteLength) {
      const count = view.getUint32(offset + 4, true)
      const size = KPC_FRAME_HEADER_BYTES + count * bytesPerPoint
      if (offset + size > buffer.byteLength) {
        break // the last frame was cut off
      }
      this.frames.push({ time: view.getUint32(offset, true) / 1000, count, offset: offset + KPC_FRAME_HEADER_BYTES })
      maxCount = Math.max(maxCount, count)
      offset += Math.ceil(size / 4) * 4
    }
    this.frameCount = this.frames.length
    this.maxPointCount = maxCount

    const lastTime = this.frameCount ? this.frames[this.frameCount - 1].time : 0
    this.duration = lastTime + (this.frameCount > 1 ? lastTime / (this.frameCount - 1) : 1 / (this.header.fps || 15))
  }

  get hasColor() {
    return this.header.hasColor
  }

  get fps() {
    return this.header.fps
  }

  frameTime(index: number) {
    return this.frames[index].time
  }

  // The frame showing at this time: the last one that starts at or before it. -1 when there are no frames.
  // Frame times are whole milliseconds in the file, so a time within a millisecond of a frame counts as that frame.
  frameIndexAt(seconds: number, hint = 0): number {
    if (!this.frameCount) {
      return -1
    }
    const t = seconds + 0.001
    let index = hint
    if (index < 0 || index >= this.frameCount || this.frames[index].time > t) {
      index = 0
    }
    while (index + 1 < this.frameCount && this.frames[index + 1].time <= t) {
      index++
    }
    return index
  }

  getFrame(index: number): KpcFrame {
    const frame = this.frames[index]
    const length = frame.count * 3
    return {
      time: frame.time,
      positions: new Int16Array(this.buffer, frame.offset, length),
      colors: this.header.hasColor ? new Uint8Array(this.buffer, frame.offset + length * 2, length) : null,
    }
  }
}

export async function parseKpc(data: ArrayBuffer) {
  return new KpcClip(isGzipped(data) ? await gunzip(data) : data)
}

export async function loadKpc(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status}`)
  }
  return parseKpc(await response.arrayBuffer())
}
