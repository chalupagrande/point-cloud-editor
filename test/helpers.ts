import { KpcClip } from '../src/kpc/KpcClip'
import { encodeKpc } from '../src/kpc/kpcWriter'
import { KpcFrame } from '../src/kpc/kpcTypes'
import { gunzip } from '../src/kpc/gzip'

// A clip of `count` frames at `fps`, each a small cube of points shifted by the frame index in x
export function syntheticFrames(count: number, fps: number, pointsPerFrame = 8): KpcFrame[] {
  return Array.from({ length: count }, (_, f) => {
    const positions = new Int16Array(pointsPerFrame * 3)
    const colors = new Uint8Array(pointsPerFrame * 3)
    for (let p = 0; p < pointsPerFrame; p++) {
      positions[p * 3] = 1000 + f * 10 + p
      positions[p * 3 + 1] = (p % 2) * 500 - 250
      positions[p * 3 + 2] = -2000 + p
      colors[p * 3] = f
      colors[p * 3 + 1] = p
      colors[p * 3 + 2] = 200
    }
    return { time: f / fps, positions, colors }
  })
}

export async function syntheticClip(count: number, fps: number, pointsPerFrame = 8) {
  const data = await encodeKpc(syntheticFrames(count, fps, pointsPerFrame), fps, true)
  return new KpcClip(await gunzip(data))
}
