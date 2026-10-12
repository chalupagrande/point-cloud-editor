import { describe, expect, it } from 'vitest'
import { KpcClip, parseKpc } from '../src/kpc/KpcClip'
import { encodeFrame, encodeKpc } from '../src/kpc/kpcWriter'
import { gunzip } from '../src/kpc/gzip'
import { syntheticFrames } from './helpers'

describe('kpc writer and reader', () => {
  it('round-trips frames through a gzipped file', async () => {
    const frames = syntheticFrames(5, 15)
    const file = await encodeKpc(frames, 15, true)
    const clip = await parseKpc(file)

    expect(clip.header).toEqual({ version: 1, hasColor: true, fps: 15, unitsPerMeter: 1000 })
    expect(clip.frameCount).toBe(5)
    expect(clip.maxPointCount).toBe(8)
    expect(clip.duration).toBeCloseTo(5 / 15)
    for (let i = 0; i < 5; i++) {
      const frame = clip.getFrame(i)
      expect(frame.time).toBeCloseTo(frames[i].time, 3)
      expect(Array.from(frame.positions)).toEqual(Array.from(frames[i].positions))
      expect(Array.from(frame.colors!)).toEqual(Array.from(frames[i].colors!))
    }
  })

  it('reads a plain (not gzipped) file too', async () => {
    const file = await gunzip(await encodeKpc(syntheticFrames(2, 30), 30, true))
    const clip = await parseKpc(file)
    expect(clip.frameCount).toBe(2)
  })

  it('pads frames to 4 bytes and keeps int16 positions aligned', () => {
    // 1 point with color = 8 + 9 = 17 bytes -> padded to 20
    const frame = { time: 0.5, positions: new Int16Array([1, -2, 3]), colors: new Uint8Array([9, 8, 7]) }
    const bytes = encodeFrame(frame, true)
    expect(bytes.byteLength).toBe(20)
    const view = new DataView(bytes)
    expect(view.getUint32(0, true)).toBe(500)
    expect(view.getUint32(4, true)).toBe(1)
    expect(view.getInt16(8, true)).toBe(1)
    expect(view.getInt16(10, true)).toBe(-2)
    expect(view.getUint8(14)).toBe(9)
  })

  it('finds the frame showing at a time', async () => {
    const clip = await parseKpc(await encodeKpc(syntheticFrames(10, 10), 10, true))
    expect(clip.frameIndexAt(0)).toBe(0)
    expect(clip.frameIndexAt(0.25)).toBe(2)
    expect(clip.frameIndexAt(0.95)).toBe(9)
    expect(clip.frameIndexAt(50)).toBe(9)
    // the hint can be ahead of the answer
    expect(clip.frameIndexAt(0.1, 7)).toBe(1)
  })

  it('ignores a frame that was cut off', async () => {
    const whole = await gunzip(await encodeKpc(syntheticFrames(3, 10), 10, true))
    const clip = new KpcClip(whole.slice(0, whole.byteLength - 5))
    expect(clip.frameCount).toBe(2)
  })

  it('rejects other files', () => {
    expect(() => new KpcClip(new TextEncoder().encode('hello world!!!!!').buffer as ArrayBuffer)).toThrow(/Not a .kpc/)
  })
})
