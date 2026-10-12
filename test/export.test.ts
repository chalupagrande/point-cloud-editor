import { describe, expect, it } from 'vitest'
import { exportProject, layerMatrix, tintToRgb, transformPositions } from '../src/model/exportProject'
import { createLayer, newProject, parseProject, serializeProject } from '../src/model/project'
import { encodeKpc } from '../src/kpc/kpcWriter'
import { parseKpc } from '../src/kpc/KpcClip'
import { syntheticClip, syntheticFrames } from './helpers'

describe('export', () => {
  it('reproduces the source exactly for one untouched layer', async () => {
    const clip = await syntheticClip(6, 15)
    const project = newProject()
    project.fps = 15
    project.layers = [createLayer('a.kpc', clip.duration, true)]
    const result = exportProject(project, new Map([['a.kpc', clip]]))

    expect(result.frames.length).toBe(6)
    expect(result.clipped).toBe(false)
    expect(result.missing).toEqual([])
    const source = syntheticFrames(6, 15)
    result.frames.forEach((frame, i) => {
      expect(frame.time).toBeCloseTo(source[i].time)
      expect(Array.from(frame.positions)).toEqual(Array.from(source[i].positions))
      expect(Array.from(frame.colors!)).toEqual(Array.from(source[i].colors!))
    })
    // and the re-encoded file reads back
    const again = await parseKpc(await encodeKpc(result.frames, result.fps, true))
    expect(again.frameCount).toBe(6)
  })

  it('offset and speed pick the expected source frames', async () => {
    const clip = await syntheticClip(10, 10) // frames at 0, 0.1, ... 0.9s
    const project = newProject()
    project.fps = 10
    const layer = createLayer('a.kpc', clip.duration, true)
    layer.offset = 0.5
    layer.speed = 0.5
    project.layers = [layer]
    const result = exportProject(project, new Map([['a.kpc', clip]]))

    // 0.5s of nothing, then 1s of clip at half speed = 2s on the timeline: 25 frames
    expect(result.frames.length).toBe(25)
    expect(result.frames[0].positions.length).toBe(0)
    expect(result.frames[4].positions.length).toBe(0)
    // the red channel is the source frame index: timeline 0.5 -> frame 0, 0.7 -> frame 1, 0.9 -> frame 2
    expect(result.frames[5].colors![0]).toBe(0)
    expect(result.frames[6].colors![0]).toBe(0)
    expect(result.frames[7].colors![0]).toBe(1)
    expect(result.frames[9].colors![0]).toBe(2)
    expect(result.frames[24].colors![0]).toBe(9)
  })

  it('merges two layers and transforms the second', async () => {
    const clip = await syntheticClip(2, 10, 4)
    const project = newProject()
    project.fps = 10
    const a = createLayer('a.kpc', clip.duration, true)
    const b = createLayer('a.kpc', clip.duration, true)
    b.position = [1, 0, 0] // one meter in x
    b.rotation = [0, 180, 0] // turned around: x -> -x, z -> -z
    b.useColor = false
    b.tint = '#ff0080'
    project.layers = [a, b]
    const result = exportProject(project, new Map([['a.kpc', clip]]))

    const frame = result.frames[0]
    expect(frame.positions.length).toBe(24)
    const source = clip.getFrame(0).positions
    // first 4 points untouched
    expect(Array.from(frame.positions.subarray(0, 12))).toEqual(Array.from(source))
    // next 4 points: x' = -x + 1000, z' = -z
    for (let p = 0; p < 4; p++) {
      expect(frame.positions[12 + p * 3]).toBe(-source[p * 3] + 1000)
      expect(frame.positions[12 + p * 3 + 1]).toBe(source[p * 3 + 1])
      expect(frame.positions[12 + p * 3 + 2]).toBe(-source[p * 3 + 2])
    }
    expect(Array.from(frame.colors!.subarray(12, 15))).toEqual([255, 0, 128])
  })

  it('reports points that leave the int16 range', () => {
    const matrix = layerMatrix({ ...createLayer('a', 1, true), position: [40, 0, 0] })
    const result = transformPositions(new Int16Array([0, 0, 0]), matrix)
    expect(result.clipped).toBe(true)
    expect(result.positions[0]).toBe(32767)
  })

  it('names layers whose clip is not loaded', () => {
    const project = newProject()
    project.layers = [createLayer('missing.kpc', 1, true, 'Camera 2')]
    const result = exportProject(project, new Map())
    expect(result.missing).toEqual(['Camera 2'])
    expect(result.frames.length).toBe(30)
  })

  it('parses tints', () => {
    expect(tintToRgb('#ffffff')).toEqual([255, 255, 255])
    expect(tintToRgb('#f08')).toEqual([255, 0, 136])
    expect(tintToRgb('nope')).toEqual([255, 255, 255])
  })
})

describe('project file', () => {
  it('serializes and parses', () => {
    const project = newProject('rig')
    const layer = createLayer('cam.kpc', 4.5, true)
    layer.rotation = [0, 90, 0]
    layer.loop = true
    project.layers = [layer]
    const parsed = parseProject(serializeProject(project))
    expect(parsed).toEqual(project)
  })

  it('fills in missing fields and rejects other files', () => {
    const parsed = parseProject('{"version":1,"layers":[{"source":"x.kpc","speed":0}]}')
    expect(parsed.layers[0].speed).toBe(1)
    expect(parsed.layers[0].tint).toBe('#ffffff')
    expect(parsed.duration).toBe('auto')
    expect(() => parseProject('{"version":2,"layers":[]}')).toThrow(/version/)
    expect(() => parseProject('{"version":1,"layers":[{}]}')).toThrow(/source/)
  })
})
