<!-- summary: Validación de la limpieza indoor: geometría, cuatro rondas visuales, salida completa de shoot.mjs y comprobaciones del navegador. -->
# Verificación indoor — 2026-11-15

Se corrigieron únicamente geometría y presentación indoor. No se usó git, no se agregaron dependencias ni se desplegaron servicios.

| Edificio | Niveles | Espacios conservados | Traslapes antes → después | Fuera del contorno antes → después |
| --- | ---: | ---: | ---: | ---: |
| Kendeda | 3 | 26 | 2 → 0 | 2 → 0 |
| CULC | 5 | 97 | 4 → 0 | 57 → 0 |

Kendeda: se recortó la circulación alrededor del concierge y el núcleo donde tocaba el auditorio; el contorno del nivel 2 ahora incluye sus espacios exteriores existentes. CULC: Winsett Gallery dejó de invadir 305, 307, 315 y 317; 150/146 y los recortes de 152/144 se alinearon al atrio. Se cerraron separaciones angostas entre vecinos y se ampliaron los contornos que sólo encerraban circulación. No se alteraron identificadores, nombres, números, capacidades, tipos, fuentes, notas ni el grafo: comparación estructural de ambos JSON contra la copia anterior, excluyendo sólo `shape` y `outline`, idéntica.

Las paredes se dibujan una sola vez a 1.5 px, con trazo sin escala. La ruta usa 2.5 px, guiones y uniones redondas. Stack reutiliza el mismo trazo y los mismos datos; su regla de guías entre esquinas alineadas quedó intacta.

Las etiquetas usan medidas reales de fuente, recuadros interiores a los polígonos y áreas libres de símbolos, ruta y controles. Intentan nombre y número, reducen hasta el mínimo de 8 px, muestran sólo el número si corresponde y finalmente se ocultan. Nombres completos disponibles en hover, selección y directorio. Los marcadores se fusionan de forma transitiva según el ancho de la pastilla; aparecen rangos como `1–3`. Los rótulos de inicio, transbordo y entrada se colocan por prioridad, sin tocar paredes, etiquetas ni bordes del lienzo; se omiten los secundarios cuando no caben.

El inicio y Reset encuadran todo el nivel con margen uniforme. Seleccionar un destino cambia a su nivel, incluso al volver a seleccionar el mismo salón; un acercamiento encuadra sólo la ruta de ese nivel y su destino.

## Archivos

- `src/data/indoor/kendeda.json`, `src/data/indoor/culc.json`.
- `src/indoor/FloorPlan.tsx`, `src/indoor/FloorPlan.css`, `src/indoor/BuildingView.tsx`.
- `src/indoor/StackView.tsx`, `src/indoor/StackView.css`, `src/lib/indoorPlan.ts`.
- `scripts/check-indoor.mjs`, estas capturas y este reporte; índices y registro de funciones generados al terminar.

## Comandos y resultados

```text
$ node scripts/check-indoor.mjs
kendeda: 3 levels, 26 spaces, 0 overlaps, 0 outside outline
culc: 5 levels, 97 spaces, 0 overlaps, 0 outside outline
PASS: 0 overlaps; all spaces inside their level outline (overlap tolerance: 0.5 square units).

$ npx tsc --noEmit
(exit 0, sin salida)

$ npm run build
(exit 0; 183 modules transformed)
✓ built in 11.36s
```

El build conserva los avisos existentes de tamaño de bundle e importación mixta de MapLibre. La API de alerts devuelve el 500 conocido en preview, ajeno a esta tarea; es el único error que registró shoot.mjs. Las 80 capturas de las cuatro rondas tienen `scrollWidth == clientWidth`, sin desbordamiento horizontal. Los PNG conservan la ronda final.

El validador también se ejercitó con bordes compartidos, un espacio contenido en otro, tiras cruzadas, tolerancia de 0.4 unidades cuadradas, una salida por concavidad, un polígono inclinado y un contorno con hueco: siete casos correctos.

Comando utilizado, sin cambios en cada ronda:

```sh
node /home/tato/agents/aria/work/tools/shoot.mjs ./docs/design/screenshots/indoor "/?in=kendeda" "/?in=culc" "/?select=room:kendeda-building-for-innovative-sustainable-design:classroom-1" "/?select=room:g-wayne-clough-undergraduate-learning-commons:culc-242" "/?in=culc&indoor=stack"
```

## Rondas visuales: cada línea de salida

Se inspeccionaron capturas de escritorio y teléfono después de cada ronda. La primera llevó a alinear las separaciones angostas y ocultar texto parcial; la segunda llevó a corregir la reselección desde otro nivel y priorizar números compactos; la tercera detectó texto bajo el zoom a 360 px y llevó a reservar los controles y elegir el recuadro que mejor admite la etiqueta. La ronda final confirma esos ajustes.

### Ronda 1: geometría, trazo y encuadre

```text
./docs/design/screenshots/indoor/1440x900_in_kendeda.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_kendeda.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_kendeda.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_kendeda.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc_indoor_stack.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc_indoor_stack.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc_indoor_stack.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc_indoor_stack.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
```

### Ronda 2: uniones y etiquetas recortadas

```text
./docs/design/screenshots/indoor/1440x900_in_kendeda.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_kendeda.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_kendeda.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_kendeda.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc_indoor_stack.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc_indoor_stack.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc_indoor_stack.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc_indoor_stack.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
```

### Ronda 3: selección repetida y números compactos

```text
./docs/design/screenshots/indoor/1440x900_in_kendeda.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_kendeda.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_kendeda.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_kendeda.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc_indoor_stack.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc_indoor_stack.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc_indoor_stack.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc_indoor_stack.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
```

### Ronda final: etiquetas libres de controles

```text
./docs/design/screenshots/indoor/1440x900_in_kendeda.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_kendeda.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_kendeda.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_kendeda.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_kendeda_building_for_innovative_sustainable_design_classroom_1.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_select_room_g_wayne_clough_undergraduate_learning_commons_culc_242.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1440x900_in_culc_indoor_stack.png scroll=1440/1440 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/1280x800_in_culc_indoor_stack.png scroll=1280/1280 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/390x844_in_culc_indoor_stack.png scroll=390/390 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
./docs/design/screenshots/indoor/360x740_in_culc_indoor_stack.png scroll=360/360 errors=["Failed to load resource: the server responded with a status of 500 (Internal Server Error)"]
```

## Comprobación del navegador

A 1440×900, 1280×800, 390×844 y 360×740 se revisaron los ocho niveles y ambos destinos: etiquetas dentro de sus espacios y del lienzo, fuente mínima, ausencia de colisiones entre etiquetas/marcadores/glifos/controles, contorno inicial completo y rutas visibles completas. Se ejercitaron cambio de piso desde instrucciones, reselección mediante búsqueda por teclado, ruta sin escaleras, modo de pasos del teléfono y el enlace `?in=culc&door=e1-n` con foco en búsqueda.

```text
{"width":1440,"name":"kendeda","level":"Level 2 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":1440,"name":"kendeda","level":"Level 1 schematic floor plan","labels":9,"markers":[],"errors":[]}
{"width":1440,"name":"kendeda","level":"Basement schematic floor plan","labels":6,"markers":[],"errors":[]}
{"width":1440,"name":"kendeda","destination":"classroom-1","level":"Level 2 schematic floor plan","labels":6,"markers":["4","5","6","7","8","9"],"errors":[]}
{"width":1440,"name":"kendeda","phase":"origin step","level":"Level 1 schematic floor plan","labels":3,"markers":["1–2","3"],"errors":[]}
PASS 1440 kendeda: direction-level switch, keyboard search and step-free route
{"width":1440,"name":"culc","level":"Level 1 schematic floor plan","labels":11,"markers":[],"errors":[]}
{"width":1440,"name":"culc","level":"Level 2 schematic floor plan","labels":12,"markers":[],"errors":[]}
{"width":1440,"name":"culc","level":"Level 3 schematic floor plan","labels":19,"markers":[],"errors":[]}
{"width":1440,"name":"culc","level":"Level 4 schematic floor plan","labels":12,"markers":[],"errors":[]}
{"width":1440,"name":"culc","level":"Level 5 schematic floor plan","labels":11,"markers":[],"errors":[]}
{"width":1440,"name":"culc","destination":"culc-242","level":"Level 2 schematic floor plan","labels":14,"markers":["9","10–11","12","13"],"errors":[]}
{"width":1440,"name":"culc","phase":"origin step","level":"Level 1 schematic floor plan","labels":6,"markers":["1–4","5","6","7–8"],"errors":[]}
PASS 1440 culc: direction-level switch, keyboard search and step-free route
{"width":1280,"name":"kendeda","level":"Level 2 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":1280,"name":"kendeda","level":"Level 1 schematic floor plan","labels":9,"markers":[],"errors":[]}
{"width":1280,"name":"kendeda","level":"Basement schematic floor plan","labels":6,"markers":[],"errors":[]}
{"width":1280,"name":"kendeda","destination":"classroom-1","level":"Level 2 schematic floor plan","labels":6,"markers":["4","5","6","7–8","9"],"errors":[]}
{"width":1280,"name":"kendeda","phase":"origin step","level":"Level 1 schematic floor plan","labels":5,"markers":["1–2","3"],"errors":[]}
PASS 1280 kendeda: direction-level switch, keyboard search and step-free route
{"width":1280,"name":"culc","level":"Level 1 schematic floor plan","labels":11,"markers":[],"errors":[]}
{"width":1280,"name":"culc","level":"Level 2 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":1280,"name":"culc","level":"Level 3 schematic floor plan","labels":13,"markers":[],"errors":[]}
{"width":1280,"name":"culc","level":"Level 4 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":1280,"name":"culc","level":"Level 5 schematic floor plan","labels":9,"markers":[],"errors":[]}
{"width":1280,"name":"culc","destination":"culc-242","level":"Level 2 schematic floor plan","labels":12,"markers":["9","10–11","12","13"],"errors":[]}
{"width":1280,"name":"culc","phase":"origin step","level":"Level 1 schematic floor plan","labels":5,"markers":["1–4","5","6","7–8"],"errors":[]}
PASS 1280 culc: direction-level switch, keyboard search and step-free route
{"width":390,"name":"kendeda","level":"Level 2 schematic floor plan","labels":8,"markers":[],"errors":[]}
{"width":390,"name":"kendeda","level":"Level 1 schematic floor plan","labels":6,"markers":[],"errors":[]}
{"width":390,"name":"kendeda","level":"Basement schematic floor plan","labels":5,"markers":[],"errors":[]}
{"width":390,"name":"kendeda","destination":"classroom-1","level":"Level 2 schematic floor plan","labels":6,"markers":["4","5","6","7–8","9"],"errors":[]}
{"width":390,"name":"kendeda","phase":"phone step","level":"Level 1 schematic floor plan","labels":4,"markers":["1–3"],"errors":[]}
PASS 390 kendeda: phone directions and Next
{"width":390,"name":"culc","level":"Level 1 schematic floor plan","labels":11,"markers":[],"errors":[]}
{"width":390,"name":"culc","level":"Level 2 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":390,"name":"culc","level":"Level 3 schematic floor plan","labels":16,"markers":[],"errors":[]}
{"width":390,"name":"culc","level":"Level 4 schematic floor plan","labels":10,"markers":[],"errors":[]}
{"width":390,"name":"culc","level":"Level 5 schematic floor plan","labels":9,"markers":[],"errors":[]}
{"width":390,"name":"culc","destination":"culc-242","level":"Level 2 schematic floor plan","labels":4,"markers":["9–11","12","13"],"errors":[]}
{"width":390,"name":"culc","phase":"phone step","level":"Level 1 schematic floor plan","labels":6,"markers":["1–4","5","6","7–8"],"errors":[]}
PASS 390 culc: phone directions and Next
{"width":360,"name":"kendeda","level":"Level 2 schematic floor plan","labels":8,"markers":[],"errors":[]}
{"width":360,"name":"kendeda","level":"Level 1 schematic floor plan","labels":5,"markers":[],"errors":[]}
{"width":360,"name":"kendeda","level":"Basement schematic floor plan","labels":5,"markers":[],"errors":[]}
{"width":360,"name":"kendeda","destination":"classroom-1","level":"Level 2 schematic floor plan","labels":3,"markers":["4","5–6","7–8","9"],"errors":[]}
{"width":360,"name":"kendeda","phase":"phone step","level":"Level 1 schematic floor plan","labels":2,"markers":["1–3"],"errors":[]}
PASS 360 kendeda: phone directions and Next
{"width":360,"name":"culc","level":"Level 1 schematic floor plan","labels":6,"markers":[],"errors":[]}
{"width":360,"name":"culc","level":"Level 2 schematic floor plan","labels":0,"markers":[],"errors":[]}
{"width":360,"name":"culc","level":"Level 3 schematic floor plan","labels":3,"markers":[],"errors":[]}
{"width":360,"name":"culc","level":"Level 4 schematic floor plan","labels":1,"markers":[],"errors":[]}
{"width":360,"name":"culc","level":"Level 5 schematic floor plan","labels":3,"markers":[],"errors":[]}
{"width":360,"name":"culc","destination":"culc-242","level":"Level 2 schematic floor plan","labels":0,"markers":["9–11","12–13"],"errors":[]}
{"width":360,"name":"culc","phase":"phone step","level":"Level 1 schematic floor plan","labels":6,"markers":["1–4","5","6","7–8"],"errors":[]}
PASS 360 culc: phone directions and Next
PASS: door sticker e1-n focuses room search
Browser checks: 0 failures
```

Pendientes: ninguno dentro del alcance solicitado. Sin publicación ni cambios de servicios.
