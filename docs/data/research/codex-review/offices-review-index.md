<!-- summary: Codex review note (2026-11-14, in Spanish): Revisión de oficinas para el mapa CIMS. -->
# Revisión de oficinas para el mapa CIMS

La revisión deja **18 pares JSON/MD con 122 objetos: 75 `confirmed`, 1 `corrected` y 46 `unconfirmed`**. No todas las fichas están listas para importar como verificadas: cada objeto conserva su propia evidencia y sus reservas. Las dos afirmaciones concretas de Gemini proporcionadas en la petición se resuelven así: VRC sí publica Biotech Quad, 311 Ferst Dr; para Price Gilbert y Crosland la dirección común publicada es 260 4th Street NW. No se dispone del resto del texto de Gemini y no se le atribuyen errores adicionales. ([VRC](https://veterans.gatech.edu/connect-with-us), [Library Locations](https://library.gatech.edu/about/locations)).

## Índice de las 18 fichas

| Nº | Entrada | Datos | Lectura |
|:--|:--|:--|:--|
| 01 | STAR | [JSON](01-star.json) | [Resumen](01-star.md) |
| 02 | Office of Student Integrity | [JSON](02-osi.json) | [Resumen](02-osi.md) |
| 03 | Parent and Family Programs | [JSON](03-parent-family.json) | [Resumen](03-parent-family.md) |
| 04 | New Student & Transition Programs | [JSON](04-nstp.json) | [Resumen](04-nstp.md) |
| 05 | Housing / Buzz STOP | [JSON](05-housing.json) | [Resumen](05-housing.md) |
| 06 | Child Care / Bright Horizons | [JSON](06-child-care.json) | [Resumen](06-child-care.md) |
| 07 | Career Center | [JSON](07-career-center.json) | [Resumen](07-career-center.md) |
| 08 | Dean of Students | [JSON](08-dean-students.json) | [Resumen](08-dean-students.md) |
| 09 | Wellness Empowerment Center | [JSON](09-wellness.json) | [Resumen](09-wellness.md) |
| 10 | Veterans Resource Center | [JSON](10-veterans.json) | [Resumen](10-veterans.md) |
| 11 | John Lewis Student Center / Information Desk | [JSON](11-student-center.json) | [Resumen](11-student-center.md) |
| 12 | OMED / Belonging / Multicultural Lounge | [JSON](12-omed-multicultural.json) | [Resumen](12-omed-multicultural.md) |
| 13 | GTPD | [JSON](13-gtpd.json) | [Resumen](13-gtpd.md) |
| 14 | SGA | [JSON](14-sga.json) | [Resumen](14-sga.md) |
| 15 | Registrar | [JSON](15-registrar.json) | [Resumen](15-registrar.md) |
| 16 | Price Gilbert / Crosland | [JSON](16-library.json) | [Resumen](16-library.md) |
| 17 | Barnes & Noble / Starbucks | [JSON](17-bookstore-starbucks.json) | [Resumen](17-bookstore-starbucks.md) |
| 18 | Waffle House Tech Square | [JSON](18-waffle-house.json) | [Resumen](18-waffle-house.md) |

## Qué significan los estados y las horas

`confirmed` significa que una fuente oficial abierta respalda la afirmación concreta, dentro de los límites escritos en `finding`. La identidad de un edificio candidato puede estar confirmada sin que lo esté su ocupación actual por una oficina. `corrected` identifica la resolución de la dirección contradictoria de las bibliotecas. `unconfirmed` significa dato ausente, fuente inaccesible, información antigua o conflicto pendiente. Una pista de un buscador en un objeto `unconfirmed` no cuenta como confirmación.

`checked_on: 2026-11-14` es la fecha de comprobación solicitada. No convierte una página sin fecha en una certificación histórica de todo el otoño de 2026. Cuando una fuente solo publica horario habitual o `Normal Hours`, se indica esta limitación; las excepciones de festivos o modified operations no se extrapolan. El JSON conserva horarios en objetos `unconfirmed` cuando sirven para documentar un conflicto: esos horarios no deben importarse como definitivos.

`hours` usa horario local de Atlanta y listas de intervalos. `[]` solo significa cierre respaldado por la fuente. Puede haber objetos con días parciales: un día omitido es desconocido o está en otro objeto, y nunca debe interpretarse como cerrado. En Student Center y librería se separan grupos de días para asociarlos a citas concretas. Waffle House utiliza `00:00` a `24:00`, donde `24:00` es el final del mismo día. No se presupone que un importador acepte esa convención sin adaptación.

## Cambios y conflictos que afectan al mapa

El VRC confirma literalmente «Georgia Tech Biotech Quad, 311 Ferst Dr, Atlanta, Georgia, 30332.». Facilities asocia esa dirección a ES&T 147, pero eso no prueba que el VRC ocupe ese edificio: queda pendiente el punto y edificio concreto. Para la biblioteca, la cita «260 4th Street, NW» respalda la dirección común de Price Gilbert y Crosland. Sus números de Facilities son 077 y 100; no se ha acreditado por qué una referencia anterior utilizó 704 Cherry. ([VRC](https://veterans.gatech.edu/connect-with-us), [Library Locations](https://library.gatech.edu/about/locations), [Facilities](https://facilities.gatech.edu/system/files/forms_files/2025MaintenanceMap24x36.pdf)).

Housing publica el punto presencial Buzz STOP en The Pavilions, enfrente de Dunkin’, pero el horario de teléfono y chat no acredita el presencial. Bright Horizons documenta TCC en Building F; el cierre presenta un conflicto interno entre cabecera y FAQ. OSI presenta discrepancia de inicio entre su contacto y SEWB, y su página exige cita previa. Wellness presenta discrepancia en el inicio del jueves. Las horas conflictivas quedan `unconfirmed`, sin escoger la opción más cómoda. ([Housing](https://housing.gatech.edu/contact), [Buzz STOP](https://www.mystuff.gatech.edu/buzz-stop), [Bright Horizons](https://child-care-preschool.brighthorizons.com/ga/atlanta/gtchildrenscampus), [OSI](https://osi.gatech.edu/about/contact-us), [Wellness](https://wellnesscenter.gatech.edu/about/contact-us), [SEWB](https://students.gatech.edu/content/hours-operation)).

El edificio Student Center y su Information Desk tienen horarios distintos; el desk está en la segunda planta. Facilities contiene identificadores 104 y 214 para Student Center con la misma dirección, y esta revisión no resuelve ese identificador único. GTPD distingue dirección física 30318 de dirección postal 30332-0440 y publica business hours 08:00 a 16:00 de lunes a viernes; tener personal 24/7 no prueba recepción pública 24/7. Registrar publica 225 North Avenue, primera planta, y horario 09:00 a 16:00 de lunes a viernes. ([Student Center](https://www.techrec.gatech.edu/student-center), [Horarios](https://www.studentcenter.gatech.edu/hours), [Facilities](https://facilities.gatech.edu/system/files/forms_files/2025MaintenanceMap24x36.pdf), [GTPD](https://police.gatech.edu/general-information), [Registrar](https://registrar.gatech.edu/about)).

Belonging & Student Support se identifica en Smithgall, suite 102 A & B; Southern Company Multicultural Lounge publica personal de 10:00 a 21:00 todos los días. Esto no permite declarar que OMED o todos los antiguos centros multiculturales hayan cerrado, se hayan fusionado o se hayan trasladado. La librería publica su propio horario, pero queda sin confirmar el de Starbucks para otoño de 2026. Waffle House #1885 publica «Saturday, 2026-11-14: Open 24 Hours», dentro de una secuencia diaria de noviembre de 2026. ([Belonging](https://support.belonging.gatech.edu/), [Multicultural Lounge](https://www.studentcenter.gatech.edu/multicultural-programs-lounge), [Bookstore](https://gatech.bncollege.com/), [Waffle House](https://locations.wafflehouse.com/atlanta-ga-1885/)).

## Huecos críticos y alcance de la validación

Career Center no pudo confirmarse por errores de acceso: faltan oficina, sala, dirección postal, teléfono y horarios de oficina y drop-in de otoño 2026. SGA tampoco pudo abrirse; no se certifican su oficina ni la sala 117. OMED redirige a GT Login o falla, de modo que no se certifica su operación actual. Las suites y direcciones actuales de Parent and Family Programs y Dean of Students siguen sin confirmar; no se convierten referencias antiguas o snippets en datos vigentes. También quedan pendientes horario presencial de Housing, recepción de GTPD, sala y horario de VRC, horario Starbucks y las discrepancias OSI, Bright Horizons y Wellness. Los intentos concretos constan en cada ficha.

Se efectuó una única validación estructural de estos 18 JSON: listas de objetos, claves requeridas, estados permitidos, fecha, URL, cita no vacía en `confirmed`/`corrected`, y formato de días e intervalos. Resultado: cero errores estructurales. Se revisó la cobertura de edificio, identificador, sala/suite, dirección, teléfono y atención presencial; se añadieron objetos `unconfirmed` donde faltaba una ausencia explícita. Se corrigieron citas insuficientes de Student Center, librería y edificios de biblioteca usando fuentes ya abiertas. No hubo investigación nueva durante esta pasada ni despliegues ni cambios en repositorios. Esta validación no confirma los hechos marcados como pendientes ni equivale a una segunda comprobación independiente de todas las fuentes. [Resultado de validación](offices-validation.json).
