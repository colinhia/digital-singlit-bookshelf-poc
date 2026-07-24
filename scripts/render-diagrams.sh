#!/bin/sh
set -eu

REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SOURCE_DIRECTORY="$REPOSITORY_ROOT/docs/diagrams/source"
OUTPUT_DIRECTORY="$REPOSITORY_ROOT/docs/diagrams/rendered"
PLANTUML_IMAGE="plantuml/plantuml:1.2026.4"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to render the documentation diagrams." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIRECTORY"

docker run --rm \
  --volume "$REPOSITORY_ROOT:/workspace" \
  --workdir /workspace \
  "$PLANTUML_IMAGE" \
  -failfast2 -tsvg -o ../rendered docs/diagrams/source

status=0

for source_path in "$SOURCE_DIRECTORY"/*.puml; do
  diagram_name=$(basename "$source_path" .puml)
  rendered_path="$OUTPUT_DIRECTORY/$diagram_name.svg"
  if [ ! -f "$rendered_path" ]; then
    echo "Missing rendered diagram: $rendered_path" >&2
    status=1
  fi
done

for rendered_path in "$OUTPUT_DIRECTORY"/*.svg; do
  diagram_name=$(basename "$rendered_path" .svg)
  source_path="$SOURCE_DIRECTORY/$diagram_name.puml"
  if [ ! -f "$source_path" ]; then
    echo "Orphaned rendered diagram: $rendered_path" >&2
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

echo "Rendered PlantUML diagrams and verified source/output parity."
