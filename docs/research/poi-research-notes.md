<!-- summary: Fuentes, coordenadas OSM, descartes y dudas para los borradores T-30 de comida, impresión, salud, fabricación y ejercicio. -->
# Investigación de POIs T-30

Investigación del 14 de noviembre de 2026 para Georgia Tech, Atlanta. Resultado: 18 food, 6 printing, 4 health, 6 makerspace y 9 exercise, todos `draft`, pendientes de comprobación humana. Las descripciones del producto están en inglés, como los datos existentes. No se investigaron Support, autobuses ni planos de Kendeda.

## Método y límites

Cada registro tiene una página oficial que respalda su existencia y actividad. Las páginas enlazadas aquí completan la evidencia cuando un dato necesita otra fuente. No se han añadido horarios ni requisitos BuzzCard: hay excepciones por calendario, condiciones de acceso o discrepancias que una semana fija no representa fielmente. Que un comercio acepte BuzzCard como pago no implica que lo exija para entrar.

Las coordenadas no proceden del seed ni de direcciones geocodificadas de forma aproximada. Se localizaron objetos nombrados mediante [OSM API, recorte del campus](https://api.openstreetmap.org/api/0.6/map?bbox=-84.407,33.769,-84.389,33.782), y se obtuvieron sus coordenadas de **Nominatim lookup**. Overpass devolvió errores, límites o timeouts. Consulta reproducible: `https://nominatim.openstreetmap.org/lookup?osm_ids=R3178621,W42706747&format=jsonv2`; sustituir la lista por los identificadores de cada registro, prefijo N para node, W para way y R para relation. © OpenStreetMap contributors, ODbL: [licencia](https://www.openstreetmap.org/copyright).

`coord_source` identifica el objeto y el método exacto. Los puntos representativos de Nominatim para edificios **no son centroides calculados ni puertas ni posiciones interiores**. Los servicios sin nodo propio comparten la coordenada de su edificio; no se les ha desplazado artificialmente. Los recintos interiores del CRC también comparten el edificio. Revisar su ubicación interior antes de usarlos para navegación hasta una sala. Los campos `building_id` usan exclusivamente `student-center`, `clough`, `library` o `crc`, identificadores ya presentes en places.json. No se han corregido los seeds.

## Food: 18 registros

Fuente principal: [directorio actual de Tech Dining](https://dining.gatech.edu/dining-locations). Incluye Brittain, North Ave y West Village, los once conceptos del Student Center, Kaldi's de Clough, Dunkin', Jimmy John's y Sideways Café. Se distinguen dining-hall, restaurant y coffee; Kinnamōns no lleva subtipo porque el catálogo no tiene bakery. Krafted, Wander Dawgs y Benny's se mantienen como **un solo local**, tal como Dining describe su mostrador compartido.

Objetos OSM utilizados:

| Lugares | Objetos |
| --- | --- |
| Brittain; North Ave; West Village | way 42706747; relation 4041026; way 516716115 |
| Big Chicken; Blenz Bowls; Fresh Brothers | nodes 14224945530, 14224945529, 14224945531 |
| Krafted/Wander Dawgs/Benny's; taïm; Kinnamōns | nodes 14224945532, 14224945533, 14224945534 |
| Marrakech Express; Twisted Taco; Dancing Goats | nodes 14224945535, 14224945528, 12348556801 |
| Chick-fil-A; Panda Express | relation 3178621, edificio John Lewis Student Center |
| Kaldi's de Clough; Dunkin'; Jimmy John's | node 9848845383; ways 1258405684, 974793135 |
| Sideways Café | relation 3178630, edificio Price Gilbert |

Comprobaciones manuales:

* Sideways: la descripción comercial de Dining dice Student Center pero su bloque de ubicación dice Price Gilbert. La [Biblioteca](https://www.library.gatech.edu/media-guide) lo sitúa junto al IMZ en Grove Level de Price Gilbert. Se usa ese edificio, no el nodo Blue Donkey 6250268928 situado hacia Crosland. Comprobar el mostrador; no crear otra sucursal a partir del texto contradictorio.
* Dunkin': Dining publica 410 4th St y OSM 460 4th St. Jimmy John's: Dining publica 410 4th St y OSM tiene 403 4th Street Northeast y un enlace antiguo a Rising Roll. Se conservan los objetos nombrados del conjunto de pabellones, pero se omiten ambas direcciones hasta comprobarlas. No se ha inferido que los dos locales estén en el mismo pabellón.
* El seed llama Stamps Student Center al edificio que OSM y Dining llaman John Lewis Student Center. Los locales llevan el `building_id` existente `student-center`; comprobar y corregir el seed en otra tarea.
* West Village tiene dos edificios OSM con el mismo nombre: se eligió way 516716115, que tiene `amenity=food_court`, en vez de way 516716114. OSM conserva operador y horarios antiguos; no se han importado.
* Kaldi's: Dining dice primer piso y otras referencias usan plantas distintas. Se ha omitido el piso. Solo Panda y Twisted Taco llevan el piso que indica explícitamente Dining.

Descartados o aplazados, con motivo:

| Lugar | Motivo |
| --- | --- |
| Boho Taco | Aplazado tras cubrir el objetivo; no se completó la asociación a un objeto OSM. |
| Conference Dining Room; Tech Square Tavern | No se completó la identificación del edificio del hotel en OSM. |
| Kaldi's Coffee @ Tech Square | No se completó la asociación del local de 55 5th Street al edificio OSM. |
| Moe's Midtown; Ray's Pizza; Sankranti; Tin Drum Asian Kitchen | Figuran en Dining, pero se aplazó el cruce final de coordenadas al alcanzar 18 registros de campus. |
| Subway; Waffle House; Gyro Bros | Aparecen en la [guía de bienvenida](https://news.gatech.edu/features/2024/08/first-year-survival-tips), pero no se completó la comprobación de cada local en una página vigente propia. |
| Blue Donkey del Student Center | No hay evidencia inequívoca de una sucursal adicional distinta de Dancing Goats y Sideways en el directorio actual. |
| Gold & Bold de EBB; Gold and Bold de Whitaker; Papa John's | Nombres presentes en OSM, sin contrastar una página oficial individual vigente. |
| Cluck 'n Moo | OSM lo conserva, pero no se completó la comprobación oficial actual. |
| Test Kitchen; Noodle Theory; Campus Crust; 5th District; Brain Freeze; The Pop Up | Conceptos anteriores sustituidos según la [noticia de septiembre de 2026](https://nique.net/news/student-center-dining-receives-a-refresh-with-six-new-retailers-1788908088600); no se importan como locales actuales. |
| Máquinas expendedoras de alimentos | La guía de Arquitectura enlaza un directorio, pero no se obtuvo una lista vigente con máquinas identificables y coordenadas fiables. |

## Printing: 6 registros

Fuentes: [Library Print Studio](https://library.gatech.edu/print-studio), [Computers & Printing](https://library.gatech.edu/computing), [guía oficial de bienvenida](https://news.gatech.edu/features/2024/08/first-year-survival-tips), [Student Organizations Hub](https://studentengagement.gatech.edu/student-organizations-hub), [CoC Printing & Copying](https://support.cc.gatech.edu/services/printing) y [guía de Arquitectura](https://arch.gatech.edu/student-resource-guide).

| Punto | OSM y precisión |
| --- | --- |
| Print Studio | relation 3178630, Price Gilbert; fuente indica planta 3 |
| Clough Printing | relation 3178622, edificio; agrupa estaciones cuya sala no se especifica |
| Crosland Printing | relation 3178620, edificio; no se inventa una estación en una planta concreta |
| Student Organizations Hub | relation 3178621, edificio; Resource Room confirmada |
| College of Computing Pharos | way 42706125, edificio; laboratorios docentes de planta 1 |
| Printing and Copying Services | way 43335058, edificio nombrado; dirección 811 Marietta respaldada por Arquitectura |

David debe comprobar la vigencia del mostrador de Marietta, las salas de Clough y Crosland y el acceso del Resource Room para estudiantes sin organización. La disponibilidad 24/7 del Hub no se ha atribuido a la estación. Los puntos de Clough y Crosland son agrupaciones por edificio, no impresoras individuales.

Descartes: mopiers de oficinas de CCB, KACB y TSRB por restricciones a personal, empleados y determinados investigadores; impresión directa de Coda por falta de punto de recogida contrastado; estaciones o plotters de Hinman y Architecture East por no completar identificación individual y acceso; antiguo punto Central-PS de Clough 215 por evidencia histórica, sin confirmación actual. No se incluyen comercios externos de la guía de Arquitectura.

## Health: 4 registros

Fuentes: [resumen oficial de servicios de Stamps y su dirección](https://students.gatech.edu/vp-letter/vpsewb-newsletter-what-role-should-ai-play-georgia-tech), [farmacia](https://health.gatech.edu/pharmacy/), [CMHCR](https://mentalhealth.gatech.edu/), [recursos de salud mental y wellness coaching](https://mentalhealth.gatech.edu/resources/students/student-mental-health-resources) y [contacto de Wellness Empowerment Center](https://wellnesscenter.gatech.edu/about/contact-us).

Stamps y Wellness usan way 42872499, Whitehead. La farmacia tiene un edificio nombrado propio, way 42872500. CMHCR usa way 42831367, Smithgall, con Suite 238 confirmada. Wellness publica Suite 204. Hay variación Joseph P./Joseph B. Whitehead entre fuentes; no se incorpora ese nombre a la dirección.

Solo cuatro registros: se priorizan destinos físicos distintos, sin multiplicar cada servicio médico como un pin. Comprobar acceso de farmacia y consulta, y recepción de Wellness. Stamps no se presenta como urgencias abiertas permanentemente. La línea de ayuda fuera de horario no implica acceso al edificio.

Descartes: Primary Care, Women's Health, Psychiatry, Allergy/Immunization, Sports Medicine y pruebas COVID como pins independientes, porque se agrupan en Stamps y no se contrastaron salas; Pharmabox de West Village por no completar su ubicación interior; consultas satélite de CMHCR por no comprobar cada sede y sala; proveedores externos y Uwill por no ser POIs físicos de campus. No se crea ningún punto de urgencias sin centro presencial contrastado.

## Makerspace: 6 registros

Fuentes: [directorio de Engineering](https://coe.gatech.edu/academics/makerspaces), [ubicación MRDC del Invention Studio](https://news.em.gatech.edu/2025/01/31/georgia-techs-student-invention-studio/), [The Hive](https://hive.ece.gatech.edu/about/), [MILL About Us](https://mill.mse.gatech.edu/about-us/), [Aero Maker Space](https://ams.gatech.edu/), [ubicaciones de AMS](https://ae.gatech.edu/yang-aero-maker-space-ams), [Innovation & Ideation](https://library.gatech.edu/innovation-ideation) y [BME Design Shop oficial](https://shop.bme.gatech.edu/), que redirige a [BME Makerspaces](https://bmemakerspaces.com/).

| Espacio | OSM y precisión |
| --- | --- |
| Flowers Invention Studio | way 42872689, MRDC; sin sala ni piso por discrepancias entre referencias |
| The Hive | way 42706132, Van Leer; la fuente confirma la rotonda |
| The MILL | way 42872649, Love; recepción en Room 176 |
| Yang Aero Maker Space | relation 3178627, Weber SST I; no se fusiona con talleres satélite |
| Innovation & Ideation | relation 3178620, Crosland; planta 2; espacio de fabricación y modelos sin maquinaria pesada |
| BME Design Shop | way 43332682, Whitaker; Room 0250, basement |

La web actual de AMS confirma acceso gratuito para todas las especialidades. La página de AE conserva una localización antigua para composites en Montgomery Knight mientras AMS dice ESM. MILL tiene avisos de cierre y reapertura de distintas temporadas mezclados: no se afirma que esté abierto hoy. BME da la bienvenida a la comunidad GT y exige orientación de seguridad; su web tiene horarios y equipos renderizados con plantillas, por lo que no se han extraído. Comprobar requisitos y funcionamiento antes de verificar los seis borradores. No confundir acceso de estudiantes con permiso automático para cada máquina.

Descartes:

* Taller satélite de composites de AMS en ESM y antiguo taller en Montgomery Knight: contradicción de sedes y acceso sin resolver; solo se incluye el espacio principal de Weber.
* BME Design Vault: acceso específico para equipos capstone; falta asociación inequívoca a objeto OSM.
* College of Design Shop: [acceso limitado a estudiantes del College y trabajo de clase](https://design.gatech.edu/design-shop), excluido de esta selección de espacios generales.
* AI Makerspace: recurso de computación; no se confirmó un destino físico visitable por estudiantes.
* Allen-Davidson-Coleman XR Makerspace: la [web](https://xr.isye.gatech.edu/) da 55 5th Street en el pie, mientras referencias docentes sitúan el estudio en ISyE Main. Falta confirmar qué edificio corresponde al servicio actual.
* Invention Studio XR, MRDC 3340: [página del grupo](https://inventionstudio.gatech.edu/tools-equipment/xr/) con horario distinto al de noticias; se agrupa bajo Flowers para evitar duplicar el espacio sin comprobar acceso.
* Montgomery Machining Mall, Idea Lab y laboratorios docentes de MRDC: [lista de seguridad](https://safety.me.gatech.edu/makerspaces/) no acredita por sí sola acceso general actual; no se añaden.
* Student Competition Center: la lista de seguridad lo ubica en 14th Street; no se verificó una sede dentro de los límites ni acceso general.

## Exercise: 9 registros

Fuente: [instalaciones de Campus Recreation](https://crc.gatech.edu/locations/). Para planificar una visita, consultar también [membresías](https://crc.gatech.edu/memberships/) y [reservas y recintos](https://mycrc.gatech.edu/Facility).

Se incluyen piscina de competición, Crawford Pool, gimnasio, rocódromo, fitness y pista interior usando way 179224195, el edificio CRC. Plantas solo donde las fuentes las especifican. Los exteriores usan way 42877981 para Roe Stamps Field, way 34775492 para Burger Bowl y way 42706659 para Peters Deck. Este último representa el aparcamiento, no cada pista.

El registro `couch-park-south-field` representa únicamente el antiguo Burger Bowl, no todo Couch Park. Roe Stamps agrupa campos y pista. Hay seis pins interiores coincidentes; David debe comprobar si quiere ese nivel de desglose y confirmar la entrada de cada recinto. No se añade otro CRC general porque ya existe como seed. Las piscinas no son edificios independientes en estos datos y no se ha inferido horario de natación de los horarios generales del CRC.

Descartes: Byers Tennis Complex, por aviso de cierre para verano de 2026 sin disponibilidad de noviembre clara; Alumni Park y su voleibol, por no completar asociación a objeto OSM específico; voleibol de Curran Deck, aplazado tras cubrir el objetivo sin comprobar el punto de la pista; Couch Park North Field, por no confirmar su objeto OSM separado; Auxiliary Court, racquetball/squash, estudios y simulador deportivo, aplazados para limitar el desglose del CRC; Pi Mile, por ser una ruta sin inicio puntual contrastado en OSM; instalaciones varsity y canchas de fraternidades, sin acceso recreativo general contrastado.
