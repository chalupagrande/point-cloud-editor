import { describe, expect, it } from 'vitest'
import { createLayer, newProject } from '../src/model/project'
import { layerEnd, localTime, offsetForLocalTime, outputTimes, projectDuration } from '../src/model/time'

const layer = (patch: Partial<ReturnType<typeof createLayer>> = {}) => ({ ...createLayer('a.kpc', 10, true), ...patch })

describe('layer time', () => {
  it('plays the clip from its offset at recorded speed', () => {
    const l = layer({ offset: 2 })
    expect(localTime(l, 1.9)).toBeNull()
    expect(localTime(l, 2)).toBe(0)
    expect(localTime(l, 5.5)).toBeCloseTo(3.5)
    expect(localTime(l, 12)).toBeNull() // one pass is 10s
    expect(layerEnd(l)).toBe(12)
  })

  it('half speed takes twice as long', () => {
    const l = layer({ offset: 2, speed: 0.5 })
    expect(localTime(l, 4)).toBeCloseTo(1)
    expect(layerEnd(l)).toBe(22)
    expect(localTime(l, 21.9)).toBeCloseTo(9.95)
    expect(localTime(l, 22)).toBeNull()
  })

  it('trims the source range', () => {
    const l = layer({ trimIn: 3, trimOut: 5, speed: 2 })
    expect(localTime(l, 0)).toBe(3)
    expect(localTime(l, 0.5)).toBe(4)
    expect(localTime(l, 1)).toBeNull()
    expect(layerEnd(l)).toBe(1)
    expect(offsetForLocalTime(l, 5)).toBe(1)
  })

  it('loops within the trimmed range', () => {
    const l = layer({ trimIn: 1, trimOut: 3, loop: true })
    expect(localTime(l, 0)).toBe(1)
    expect(localTime(l, 2.5)).toBeCloseTo(1.5)
    expect(localTime(l, 7.25)).toBeCloseTo(2.25)
  })

  it('an empty range never shows', () => {
    expect(localTime(layer({ trimIn: 4, trimOut: 4 }), 1)).toBeNull()
  })
})

describe('project duration', () => {
  it('auto duration ends with the last visible layer', () => {
    const project = newProject()
    project.layers = [layer({ offset: 1 }), layer({ offset: 5, speed: 2 }), layer({ offset: 20, visible: false })]
    expect(projectDuration(project)).toBe(11)
    project.duration = 4
    expect(projectDuration(project)).toBe(4)
  })

  it('output times cover the duration at the fps', () => {
    expect(outputTimes(1, 4)).toEqual([0, 0.25, 0.5, 0.75])
    expect(outputTimes(0, 30)).toEqual([])
  })
})
