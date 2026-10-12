# Point Cloud Editor

A small editor for `.kpc` point cloud recordings (the files `record_server.py` in the Kinect client repo writes). Load recordings as layers, move them in space and time, and export one merged `.kpc` that plays anywhere the originals do. Sources are never modified.

## Running

```
nvm use          # Node 24
yarn
yarn dev         # http://localhost:5173
```

`yarn build` makes a static site in `dist/` that runs from any file host, no server needed. `yarn test` runs the unit tests, `yarn lint` the linter.

## Using it

**Files.** In Chrome, `Open Folder…` opens the folder your recordings are in (for example the client repo's `recordings/`). Projects and exports are saved back into that folder, and the folder is remembered for next time. In other browsers, `Add Files…` or drag-and-drop loads clips, and saving downloads the file.

**Layers.** Every clip you add is a layer. Select one in the list, the timeline or by clicking its points, then:

- move, rotate or scale it with the gizmo (`g`, `r`, `s` switch modes) or the number fields
- set where it starts on the timeline, trim its in/out points, change its speed, or loop it
- turn recorded color off and tint it, which helps when lining two clips up

**Timeline.** Drag a bar to move it in time, drag its ends to trim. The ruler sets the playhead; space plays and pauses; `Home` goes to the start. Wheel pans, `⌘`/`ctrl` + wheel zooms. Bars snap to each other's edges.

**Export.** Sets the frame rate and duration (`auto` ends with the last layer) in the transport bar, then `Export .kpc`. Every frame of the export samples each layer at that moment, applies its transform, and merges everything into one frame. Speed changes repeat or drop frames; there is no interpolation yet.

**Projects.** `Save Project` writes `<name>.pce.json` next to the clips with every layer's settings. Open it again later; clips are found by file name in the same folder.

## Typical jobs

- *Two cameras slightly off*: load both takes, tint one, nudge it with the gizmo until the overlap is tight, export.
- *One subject, two takes from different angles*: load both, align them, drag one bar in time until the action lines up, export.
- *Splice clips*: place bars one after another, trim where the cuts should be.
- *Slow motion*: set a layer's speed to 0.5 and export at 30 fps.

## Units and coordinates

Positions are edited in meters (the files store millimeters). y is up. The origin of a recording is the Kinect's position, so a recorded floor sits below y = 0 by the camera's height. Positions must stay within ±32 m of the origin; the export warns if anything is clamped.

## Layout

- `src/kpc/` reading and writing the `.kpc` format (`KpcClip`, `kpcWriter`, `gzip`)
- `src/model/` the project data model, time maths and the export, all pure and unit-tested in `test/`
- `src/store/` zustand store for the project, selection and playback
- `src/files/` folder access (File System Access API) with picker/download fallback, and the actions behind the buttons
- `src/viewport/` the R3F scene: one `LayerPoints` per layer and the gizmo
- `src/timeline/` the timeline and transport bar
- `src/panels/` files, layer list, layer inspector
- `src/controls/` small reusable form rows
