# Blender sources

Authoring files for runtime models served by the backend. After editing a `.blend`, re-export the matching GLB/GLTF under `apps/backend/src/assets/` so the app does not serve a stale file.

## Mapping

| Source                                 | Runtime                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `fixtures/_defaults/led_par_can.blend` | `apps/backend/src/assets/fixtures/_defaults/model.glb` |
| `rig/light_stand.blend`                | `apps/backend/src/assets/3d/light_stand.glb`           |

Room GLTF (`apps/backend/src/assets/3d/room.gltf`) is served as-is; there is no matching file in this folder.

## Export

Use the Cursor Blender MCP (`uvx blender-mcp` in `.cursor/mcp.json`): open the source `.blend` if needed (`bpy.ops.wm.open_mainfile`), then:

```python
bpy.ops.export_scene.gltf(
    filepath="<runtime glb>",
    export_format="GLB",
    use_visible=True,
    export_cameras=False,
    export_lights=False,
    export_apply=True,
)
```
