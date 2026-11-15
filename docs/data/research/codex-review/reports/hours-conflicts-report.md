<!-- summary: Codex review note (2026-11-14, in Spanish): Verificación de servicios de Georgia Tech. -->
# Verificación de servicios de Georgia Tech

**Print Studio coincide con Gemini y CRC confirma domingo a las 09:00 para otoño de 2026.** Brittain reabrió el 17 de agosto de 2026, no sirve desayuno y publica apertura habitual de lunes a viernes. Permanecen conflictos oficiales en farmacia, Conference Dining Room, Sankranti y Tech Square Tavern. Los nueve pares de entregables conservan fuentes, citas y los huecos marcados; no se han trasladado horarios especiales a la semana habitual.

## Entregables por cada punto solicitado

| Punto | Tema | Datos | Resumen y cambios |
|---|---|---|---|
| 1 | Print Studio | [JSON](../01-print-studio.json) | [MD](../01-print-studio.md) |
| 2 | CRC y nueve espacios o servicios | [JSON](../02-crc.json) | [MD](../02-crc.md) |
| 3 | Brittain | [JSON](../03-brittain.json) | [MD](../03-brittain.md) |
| 4 | Stamps Pharmacy | [JSON](../04-pharmacy.json) | [MD](../04-pharmacy.md) |
| 5 | Conference Dining Room | [JSON](../05-conference-dining.json) | [MD](../05-conference-dining.md) |
| 6 | Siete locales de Tech Square | [JSON](../06-tech-square.json) | [MD](../06-tech-square.md) |
| 7 | Doce conceptos del Student Center | [JSON](../07-student-center.json) | [MD](../07-student-center.md) |
| 8 | Dunkin’, Chick-fil-A, Dancing Goats, Kaldi’s Clough | [JSON](../08-campus-coffee.json) | [MD](../08-campus-coffee.md) |
| 9 | Acceso a Clough/Crosland e impresoras | [JSON](../09-library-access.json) | [MD](../09-library-access.md) |

## Qué se confirma o corrige respecto a Gemini

Print Studio publica «Fall & Spring Hours» y las franjas «Saturday, 12pm-6pm» y «Sunday, 10am-10pm». La asimetría del fin de semana es real en la fuente, y su semana normal coincide con Gemini. [Print Studio](https://library.gatech.edu/print-studio).

CRC etiqueta sus horas «Fall 2026 Hours of Operation» y dice «Sunday: 9 a.m. – 10 p.m.». Esta fuente departamental específica, corroborada por la página de horarios del CRC, prevalece sobre el resumen central sin semestre que muestra «Sun | 10 a.m. - 10:00 p.m.». No procede corregir el domingo de Gemini a las 10:00. [Portada CRC](https://crc.gatech.edu/), [horarios CRC](https://crc.gatech.edu/hours/), [resumen central contradictorio](https://students.gatech.edu/content/hours-operation).

Brittain tiene dirección publicada «649 Techwood Dr NW, Atlanta, GA 30330»; el código postal se conserva literalmente porque no se ha acreditado una corrección. La noticia posterior a la apertura dice «Closed for renovation in 2024, Brittain reopened on Aug. 17.» y el anuncio previo precisa «After an extensive two-year renovation». La apertura habitual publicada es de lunes a viernes de 11:00 a 23:00; no hay desayuno ni servicio habitual de fin de semana, pues el anuncio declara «Brittain will not open for breakfast or on weekends». No se ha encontrado una frontera actual verificable entre almuerzo y cena. [Ficha Brittain](https://dining.gatech.edu/location/brittain-dining-hall-0), [reapertura confirmada](https://www.gatech.edu/news/2026/08/21/whats-new-tech-dining), [anuncio y reforma](https://www.gatech.edu/news/2026/08/12/brittain-dining-hall-reopening-following-two-year-renovation).

Moe’s es otra corrección clara entre fuentes: el operador publica «Monday 10:00 AM - 11:00 PM», frente a «Monday: 10:30 am - 10:00 pm» en Tech Dining. Se conserva la semana del operador, con la limitación de que la ficha no etiqueta expresamente otoño de 2026. Los siete locales de Tech Square incluyen dirección y horario cuando se ha podido acreditar uno inequívoco. [Operador Moe’s](https://locations.moes.com/ga/atlanta/85-5th-st-nw), [Tech Dining](https://dining.gatech.edu/location/moes-midtown-georgia-tech).

## Conflictos y huecos que no deben convertirse en datos del mapa

La farmacia tiene una contradicción real: Stamps publica «The Pharmacy will be closed from 12:30 pm to 1:30 pm daily.», mientras que la página central dice «Closed for lunch daily from 12 p.m. – 12:30 p.m.». Las páginas de farmacia y portada no la resuelven. Se conserva el horario publicado de la fuente propia como candidato textual, pero no una semana operativa certificada ni fines de semana inventados. [Stamps contacto](https://health.gatech.edu/contact-us/), [Student Engagement](https://students.gatech.edu/content/hours-operation).

Conference Dining Room no queda acreditado como exclusivo de huéspedes, pero tampoco aparece una garantía expresa de acceso libre a no huéspedes. Aceptar BuzzCard, «We proudly accept Buzz Cards at this location!», no demuestra por sí solo esa condición. El operador ofrece «Monday-Friday 11am - 2pm», frente a las franjas de Tech Dining «Breakfast: 7-11, Lunch: 11:30-2, Dinner: 4-11». No se elige un horario público único. Tech Square Tavern también presenta tablas oficiales incompatibles y permanece `unconfirmed`. [Conference Dining Room del operador](https://www.gatechhotel.com/dining/conference-dining-room), [Tech Dining](https://dining.gatech.edu/location/conference-dining-room), [Tavern operador](https://www.gatechhotel.com/dining/tech-square-tavern), [menú Tavern](https://www.gatechhotel.com/gallery/tech-square-tavern-menu).

Dentro del CRC no se ha encontrado horario propio expreso para Fitness Floor, Indoor Track o Main Gymnasium. Bike Shop publica «Monday – Friday 2 – 6 p.m.» pero omite sábado/domingo. Climbing Wall y Wilderness publican días entre semana sin acreditar expresamente el cierre general de fin de semana. Sus horas conocidas se conservan en `published_weekday_hours`, y los días desconocidos no se convierten en `[]`. Las calles del Crawford presentan un sábado de 13:00 a 18:00 que coincide con la excepción del 14 de noviembre; ese sábado no se ha certificado como habitual. [CRC instalaciones](https://crc.gatech.edu/locations/), [Bike Shop](https://crc.gatech.edu/bike-shop/), [Wilderness](https://crc.gatech.edu/wilderness-outpost/), [CRC horas](https://crc.gatech.edu/hours/).

Clough y Crosland tienen acceso durante el semestre las 24 horas para la comunidad GT: «All three buildings are open seven days a week, 24 hours a day when school is in session». Para entrada nocturna se indica «BuzzCards are required for entrance from 6pm to 7am». Eso no demuestra disponibilidad operativa de todas las impresoras las 24 horas: ni las FAQ consultadas ni la página de impresión lo afirman. Las impresoras ordinarias quedan `unconfirmed` en ese aspecto, y los pósteres tienen la limitación expresa «Poster printing is only available while the Print Studio is open and staffed». [Guía de biblioteca](https://library.gatech.edu/quick), [horarios y acceso](https://library.gatech.edu/about/hours), [FAQ de impresoras](https://libanswers.library.gatech.edu/tech_computers_print/faq/389103), [Print Studio](https://library.gatech.edu/print-studio).

## Alcance temporal, cierres y validación

La fecha de comprobación solicitada es el **14 de noviembre de 2026**, en horario local de Atlanta. `confirmed` identifica el dato que la fuente publica y que pudo consultarse; no garantiza todo un semestre si la página no lo nombra. Las fichas comerciales y de Tech Dining que no identifican otoño de 2026 lo advierten en `finding` y `temporal_scope`. La etiqueta estacional de Print Studio tampoco identifica un año. El CRC sí identifica otoño de 2026 y Brittain tiene noticias fechadas de su reapertura. Los bloques de Thanksgiving y eventos acuáticos se mantienen separados.

Las etiquetas instantáneas `location is open` o `location is closed` no se han usado como prueba de cierre permanente. Tech It To Go mantiene su semana publicada aunque su etiqueta fuera `closed`; Tech Square Tavern también queda separado de una afirmación de cierre definitivo. Las fichas con `[]` de restauración lo reciben por un día marcado `Closed` en `Normal Hours`, no por esa etiqueta de disponibilidad.

La validación local cubre exclusivamente estos nueve JSON: listas, campos obligatorios, estados permitidos, fecha, formato de las siete claves de `hours`, intervalos válidos y citas no vacías. El resultado y los recuentos están en [validation.json](../validation.json). No se ha vuelto a investigar ni se ha modificado ningún repositorio o despliegue. El navegador produjo automáticamente, de forma inesperada, `.playwright-mcp/page-2026-11-15T02-39-40-554Z.yml` y `.playwright-mcp/console-2026-11-15T02-39-38-260Z.log` fuera de `out/`; no se han borrado ni editado manualmente. Todas las escrituras explícitas se limitaron a `out/`.
