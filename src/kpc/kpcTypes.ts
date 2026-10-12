// .kpc: a point cloud recording. One gzip stream of a header followed by frames, little endian.
//
//   header (16 bytes): "KPC1" | u8 version | u8 flags (bit 0 = has color) | u16 fps | f32 units per meter | u32 reserved
//   frame:             u32 ms since start | u32 point count N | int16[N * 3] xyz | u8[N * 3] rgb (if has color) | padding to 4 bytes
//
// Positions are millimeters with y up, as written by record_server.py in the Kinect client repo.

export const KPC_MAGIC = 0x3143504b // "KPC1" read as a little-endian u32
export const KPC_VERSION = 1
export const KPC_FLAG_COLOR = 1
export const KPC_HEADER_BYTES = 16
export const KPC_FRAME_HEADER_BYTES = 8
export const KPC_UNITS_PER_METER = 1000

export type KpcHeader = {
  version: number
  hasColor: boolean
  fps: number
  unitsPerMeter: number
}

// One frame's data. The arrays are views into the clip's buffer or freshly built, never modified by readers.
export type KpcFrame = {
  time: number // seconds since the start of the recording
  positions: Int16Array // xyz, millimeters
  colors: Uint8Array | null // rgb
}
