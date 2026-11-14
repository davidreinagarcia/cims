<!-- summary: Fuentes oficiales, coordenadas OSM, descartes y dudas de los 13 borradores de organizaciones y oficinas T-32. -->
# Organizaciones y oficinas de Georgia Tech

Investigación del 14 de noviembre de 2026 para T-32 y ADR-0004. Resultado: 13 puntos, todos `draft`, sin atribuir verificación humana: 5 `campus-org`, 4 `admin`, 1 `community` y 3 `club`. Los nombres se conservan en su idioma oficial. Las descripciones son paráfrasis breves. No se incluyen contactos personales ni horarios. No se han modificado eventos DEMO ni otros datos del campus.

## Fuentes por subtipo

Cada fila corresponde al `id` del JSON. La fuente enlazada acredita la ubicación; las fuentes complementarias explican la actividad cuando la página de contacto solo indica la dirección.

### campus-org

| ID | Fuente y evidencia de ubicación |
| --- | --- |
| `center-student-engagement` | [Contacto del Center for Student Engagement](https://studentengagement.gatech.edu/about/contact-us): suite 3110, John Lewis Student Center; también explica su asesoramiento a organizaciones. |
| `fraternity-sorority-life` | [Directorio universitario Engage](https://gatech.campuslabs.com/engage/organization/Fraternity-and-Sorority-Life): 3110 John Lewis Student Center, 351 Ferst Drive; describe la misión de asesoramiento. El buscador devuelve el contenido de la ficha; la apertura directa requiere JavaScript. |
| `student-government-association` | [SGA Open House, calendario oficial de agosto de 2025](https://calendar.gatech.edu/event/2025/08/15/sga-open-house): identifica expresamente la oficina de SGA en la tercera planta del John Lewis Student Center. Hay discrepancia con la página de contacto de SGA, véase abajo. Se representa SGA conjuntamente, sin inventar despachos distintos para sus ramas. |
| `office-student-media` | [Contacto de Student Media](https://studentmedia.gatech.edu/about/contact-us): segunda planta, suite 2150, John Lewis Student Center. [Historia de la oficina](https://studentmedia.gatech.edu/about/our-history) y [organizaciones de medios](https://studentmedia.gatech.edu/media-organizations) explican su función. |
| `student-campus-event-centers` | [Equipo profesional de SCEC](https://studentcenter.gatech.edu/our-professional-team): oficina en la tercera planta del John Lewis Student Center; [página principal](https://studentcenter.gatech.edu/) describe sus edificios y programas. No se presupone una suite concreta. |

### admin

| ID | Fuente y evidencia de ubicación |
| --- | --- |
| `office-registrar` | [About the Registrar's Office](https://registrar.gatech.edu/about): primera planta del Administration Building, Tech Tower, 225 North Avenue; enumera servicios de matrícula y expedientes. |
| `career-center` | [Contact Us](https://career.gatech.edu/contact-us/) (the earlier Hours of Operation page returns 404; the floor it mentioned could not be re-confirmed and was removed): personal en la primera planta del Bill Moore Student Success Center, 219 Uncle Heinie Way; entrevistas en la planta inferior. La búsqueda recuperó la página, aunque una apertura posterior devolvió 502. |
| `scholarships-financial-aid` | [Contacting Our Office](https://finaid.gatech.edu/contacting-our-office): tercera planta del Bill Moore Student Success Center; [página de Financial Aid](https://finaid.gatech.edu/) describe becas y financiación. No se utiliza su dirección postal genérica como ubicación física. |
| `office-international-education` | [Hours and Contact Information](https://oie.gatech.edu/directions): distingue la dirección postal del mostrador físico y sitúa ambos en Savant, suite 211, 631 Cherry Street; [página principal de OIE](https://oie.gatech.edu/) describe sus tres áreas de actividad. |

### community

| ID | Fuente y evidencia de ubicación |
| --- | --- |
| `civic-engagement` | [Connect With Us](https://civic-engagement.gatech.edu/about/connect-us): oficina dentro de CSE, suite 3110 del John Lewis Student Center; [página principal](https://civic-engagement.gatech.edu/home) explica la conexión entre voluntariado, alumnado y entidades comunitarias. |

Solo una entrada: no se crean puntos separados para programas por compartir una oficina asesora sin evidencia de sede propia.

### club

| ID | Fuente y evidencia de ubicación |
| --- | --- |
| `wrek-radio` | [About WREK](https://wrek.org/about): emisora gestionada por estudiantes que transmite desde el Student Center; pie con suite 2140, 351 Ferst Drive. [Historia de Student Media](https://studentmedia.gatech.edu/about/our-history) confirma el traslado al John Lewis Student Center en 2022. Se clasifica como `club` por su operación estudiantil, aunque es un medio y no un club de aficiones. |
| `erato-magazine` | [About Us de Erato](https://erato.gtorg.gatech.edu/about/): revista de arte y literatura, reuniones regulares en Student Media Room, sala 2150 del Student Center. Se admite su lugar de reunión documentado, sin prometer acceso permanente. |
| `dramatech-theatre` | [Historia de DramaTech](https://dramatech.org/about/history/): identifica la Black Box trasera del Ferst Center como sede permanente; [direcciones](https://dramatech.org/about/directions/) da la dirección física 349 Ferst Drive y el acceso lateral. El [calendario oficial de julio de 2026](https://calendar.gatech.edu/event/2026/07/17/dramatech-presents-orlando) corrobora el teatro y la dirección. |

## Coordenadas OpenStreetMap

Consultas realizadas a [Nominatim Search](https://nominatim.openstreetmap.org/search), formato `jsonv2`, con `viewbox=-84.42,33.79,-84.375,33.76` y `bounded=1`. Cada coordenada se copió de `lon` y `lat` del resultado; no se usaron las coordenadas aproximadas de `places.json`. `coord_source` conserva tipo, identificador y nombre exacto de OSM. Los intentos previos de Overpass no devolvieron datos utilizables (406 y 429); ninguna coordenada procede de ellos.

| Consulta | Elemento OSM | [lng, lat] | Aplicación |
| --- | --- | --- | --- |
| John Lewis Student Center | [relation 3178621](https://www.openstreetmap.org/relation/3178621), John Lewis Student Center | [-84.3988236, 33.7741957] | Ocho registros en el Student Center, incluido Civic Engagement. |
| Student Success Center | [way 42706711](https://www.openstreetmap.org/way/42706711), Bill Moore Student Success Center | [-84.3939568, 33.7724421] | Career Center y Financial Aid. |
| Savant Building | [way 42830543](https://www.openstreetmap.org/way/42830543), Savant Building | [-84.3952667, 33.7720875] | OIE. |
| Tech Tower | [way 42706709](https://www.openstreetmap.org/way/42706709), Lettie Pate Whithead Evans Administration Building | [-84.3946737, 33.7724961] | Registrar. Se conserva la grafía de OSM únicamente en `coord_source`. |
| DramaTech | [node 5108328828](https://www.openstreetmap.org/node/5108328828), DramaTech | [-84.3991059, 33.7752999] | Punto específico del teatro. La consulta DramaTech Theatre devolvió el mismo nodo. |

También se consultó Ferst Center for the Arts: way 43332730, punto [-84.3992142, 33.7751186]. Se prefirió el nodo específico de DramaTech. Los puntos de edificios son representativos del edificio, no de entradas, salas o despachos. Los registros coincidentes no se desplazan artificialmente para separarlos. Solo se asignan los `building_id` existentes `student-center` y `tech-tower`; el resto queda sin enlace de edificio.

## Candidatos descartados

Lista de candidatos considerados para inclusión, no de todas las entidades incidentales que aparecen en los resultados de búsqueda.

| Candidato | Fuente consultada y motivo |
| --- | --- |
| Graduate Student Government Association como punto separado | [Ficha Engage](https://gatech.campuslabs.com/engage/organization/graduate-student-government-association): solo da 353 Ferst Drive, coincidente con la referencia antigua a Smithgall; no acredita un despacho actual distinto. Ya se incluye SGA conjunta con evidencia del Student Center. |
| Student Center Programs Council (SCPC) | [Página de SCPC](https://studentcenter.gatech.edu/scpc) y [SCEC](https://studentcenter.gatech.edu/): acreditan el programa y su adscripción, pero no identifican de forma inequívoca su oficina entre los edificios gestionados. Se incluye SCEC, cuya ubicación sí se declara expresamente. |
| Technique | [Listado oficial de medios](https://studentmedia.gatech.edu/media-organizations) acredita su existencia. Las ubicaciones concretas recuperadas fueron referencias antiguas a Smithgall o una publicación no oficial en Reddit sobre la suite 2150. No se generaliza la dirección de Student Media a todos sus medios. |
| Mobilizing Opportunities for Volunteer Experiences (MOVE) | [Civic Engagement](https://civic-engagement.gatech.edu/home) lo enumera como organización de servicio. No se obtuvo una sede física propia actual; la referencia de prensa a su oficina en el Student Center era histórica. |
| Alternative Service Breaks (ASB) | [Guía de recursos del Provost](https://provost.gatech.edu/reporting-units/advocacy/student-resource-guide) y referencias de Civic Engagement: programa de servicio sin sede específica acreditada en lo consultado. |
| Jumpstart | [Guía del Provost](https://provost.gatech.edu/reporting-units/advocacy/student-resource-guide), [Engagement, Activities & Community](https://students.gatech.edu/engagement-activities-community) y [guía histórica de service learning](https://sites.gatech.edu/bfhandbook/service-learning/): no se obtuvo una oficina actual propia; no se adopta la antigua sala 2211 de Leadership & Civic Engagement. |
| Oficina de relaciones comunitarias / CEISMC | La búsqueda de una segunda oficina comunitaria devolvió principalmente una [guía K-12 de 2014](https://gov.gatech.edu/sites/default/files/documents/2014_k-12_for_educators.pdf), insuficiente para acreditar una sede actual. No se crea ningún registro. |
| Bursar | [Quick Help](https://bursar.gatech.edu/quick_help) mezcla indicaciones antiguas de 2020 y restricciones de visitas; no se resuelve la atención presencial actual. |
| Undergraduate Admission | [Contacto](https://admission.gatech.edu/contact) advierte que su dirección postal no es una dirección GPS. Se omite sin investigar más allá al haber suficientes oficinas bien ubicadas. |
| Dean of Students / Student Life | Se encontraron referencias secundarias universitarias a Smithgall con distintas suites. No se incluyen sin resolverlas; no se amplía la investigación de servicios de Support. |

No se investigan los servicios de salud, accesibilidad, asistencia de emergencia, restauración, impresión o fabricación de otros ficheros. Tampoco se usa el evento DEMO de robótica como prueba de un club real.

## Dudas para revisión humana

1. SGA: [su contacto](https://www.sga.gatech.edu/contact-us/) aún invita a visitar Smithgall, pero el calendario oficial de 2025 y el [plano universitario del Student Center](https://bpb-us-e1.wpmucdn.com/sites.gatech.edu/dist/8/2865/files/2023/05/Student-Center-Map.pdf) sitúan Student Government en el Student Center. Se eligió esta última sede, pendiente de confirmar presencialmente, incluida la atención a graduados.
2. Student Center: las fuentes oficiales alternan 350 y 351 Ferst Drive. Se conservan salas y edificio sin completar números postales cuando no aportan certeza. El punto OSM representa el conjunto, no una puerta concreta ni el ala de cada oficina.
3. Confirmar que Erato continúa reuniéndose en la sala 2150 este semestre. No se añaden días u horas de reunión al JSON porque pueden cambiar.
4. Confirmar accesos a las suites y al teatro antes de marcar los registros como verificados. No se han supuesto requisitos de BuzzCard ni acceso libre.
5. `club` contiene dos medios estudiantiles y un teatro; `community` solo tiene Civic Engagement. Se prioriza una ubicación demostrable frente a equilibrar artificialmente los subtipos.
