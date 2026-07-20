# Archived room décor

Archived décor remains maintained and type-checked but is not imported by the live room, so it does not enter the active scene or its client bundle.

To restore an element:

1. Import its component from this directory into the active room composition.
2. Mount it alongside the other décor. Each component uses its recorded default position when no `position` prop is supplied.
3. If a different placement is needed, pass a `[x, y, z]` position explicitly.

When archiving another element, keep its complete rendering and resource-disposal logic in its own component, add an entry to `archivedRoomDecor`, and remove all imports from the live composition.
