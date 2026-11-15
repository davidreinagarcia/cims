<!-- summary: Importación conservadora de la investigación de Tato del 2026-11-14 y revisión humana pendiente. -->
# Importación de investigación — 2026-11-14

Entrada: 101 registros. Coincidencias: 20; con campos completados: 20; campos completados: 78.

Añadidos: 36. Omitidos: 18. Amenities separados sin modificar: 27.

Los POI curados conservan ids, coordenadas, estado, source_url y todos sus valores existentes. Las coincidencias exigen nombre/alias y edificio compatible (metadatos o contención en su huella); un id idéntico establece identidad explícita. No se fusionan impresoras de pisos distintos con un registro genérico del edificio.

Transport está en LAYER_CATALOG y el validador admite sus POI. Solo se consideran instalaciones fijas; las paradas Stinger/bus se omiten.

Los horarios con 24:00 se conservan literalmente en hours_note, sin redondear a 23:59 ni crear intervalos inventados. Los conflictos conservan el horario curado. Los subtipos solo se escriben si el catálogo los enumera.

El archivo import-audit-2026-11-14.json conserva las altas y campos completados originales para que una segunda ejecución mantenga este reporte sin duplicar registros. No eliminarlo si se desea conservar esa auditoría.

## Altas por categoría

| Categoría | Añadidos |
| --- | ---: |
| food | 3 |
| support | 10 |
| printing | 12 |
| makerspace | 0 |
| exercise | 1 |
| health | 2 |
| transport | 8 |

## Registros añadidos

| ID | Nombre | Categoría | Método de coordenadas | Precisión |
| --- | --- | --- | --- | --- |
| boho-taco-tech-square | Boho Taco | food | OSM node 535031257 (David research) | exact |
| tech-square-tavern | Tech Square Tavern | food | building centroid: georgia-tech-hotel-and-conference-center | building |
| collective-food-hall-coda | The Collective Food Hall | food | building centroid: coda | building |
| coc-tso-help-desk | College of Computing TSO Help Desk | support | building centroid: college-of-computing-building | building |
| oit-asc-walk-up-support | OIT Administrative Services Center (ASC) Walk-Up Support | support | building centroid: g-wayne-clough-undergraduate-learning-commons | building |
| jlsc-information-desk | John Lewis Student Center Information Desk | support | building centroid: john-lewis-student-center | building |
| georgia-tech-post-office | Georgia Tech Post Office | support | building centroid: john-lewis-student-center | building |
| scec-event-services-office | Student and Campus Event Centers Administration and Event Services | support | building centroid: john-lewis-student-center | building |
| buzzcard-center | BuzzCard Center | support | building centroid: john-lewis-student-center | building |
| bursars-office | Office of the Bursar | support | building centroid: lyman-hall-building | building |
| office-of-disability-services | Office of Disability Services (ODS) | support | building centroid: flag-building-charles-a-smithgall-jr-building | building |
| gtpd-headquarters | Georgia Tech Police Department (GTPD) | support | OSM way 751387123 (David research) | exact |
| pts-customer-service-center | Parking and Transportation Services (PTS) Customer Service Center | support | building centroid: technology-square-parking-deck | building |
| crosland-grove-printers | Crosland Tower Grove Level Printers and Copier/Scanner | printing | building centroid: dorothy-murray-crosland-tower | building |
| crosland-2f-bw-printer | Crosland Tower 2nd Floor B&W Printer | printing | building centroid: dorothy-murray-crosland-tower | building |
| crosland-6f-gsc-color-printer | Crosland Tower 6th Floor Color Printer (Graduate Student Community) | printing | building centroid: dorothy-murray-crosland-tower | building |
| price-gilbert-3f-purple-zone-printer | Price Gilbert 3rd Floor Purple Zone Color Printer | printing | building centroid: price-gilbert-memorial-library | building |
| clough-2f-color-printer | Clough Commons 2nd Floor Color Printer | printing | building centroid: g-wayne-clough-undergraduate-learning-commons | building |
| clough-3f-pink-zone-printer | Clough Commons 3rd Floor B&W Printer (Pink Computing Zone) | printing | building centroid: g-wayne-clough-undergraduate-learning-commons | building |
| clough-4f-bw-printer | Clough Commons 4th Floor B&W Printer | printing | building centroid: g-wayne-clough-undergraduate-learning-commons | building |
| ccb-1f-pharos-printer | College of Computing Building 1st Floor Pharos Station | printing | building centroid: college-of-computing-building | building |
| ccb-ground-pharos-printer | College of Computing Building Ground Floor Pharos Station | printing | building centroid: college-of-computing-building | building |
| klaus-ece-public-lab-printers | Klaus ECE Public Lab Pharos Printers | printing | building centroid: christopher-w-klaus-advanced-computing-building | building |
| van-leer-c257-ece-lab-printer | Van Leer C257 ECE Public Lab Pharos Printer | printing | building centroid: van-leer-building | building |
| architecture-west-359a-plotters | Architecture West Plotter Printers | printing | building centroid: architecture-west | building |
| ken-byers-tennis-complex | Ken Byers Tennis Complex | exercise | OSM way 42789686 (David research) | exact |
| pharmabox-clough | Pharmabox (Clough Commons) | health | building centroid: g-wayne-clough-undergraduate-learning-commons | building |
| cmhcr-cos-mose-1120b | CMHCR Embedded Clinician Office - College of Sciences | health | building centroid: glen-p-robinson-jr-building | building |
| w02-student-center-parking-deck | W02: Student Center Parking Deck | transport | building centroid: student-center-parking-deck | building |
| w22-dalney-parking-deck | W22: Dalney Parking Deck | transport | building centroid: dalney-street-parking-deck | building |
| e81-tech-square-parking-deck | E81: Tech Square Parking Deck | transport | building centroid: technology-square-parking-deck | building |
| coda-parking-garage | Coda Building Parking Garage | transport | building centroid: coda | building |
| w02-bike-room-fix-it | W02 Bike Room and Bike Repair Station | transport | building centroid: student-center-parking-deck | building |
| w22-bike-room-fix-it | W22 Dalney Bike Room and Fix-It Station | transport | building centroid: dalney-street-parking-deck | building |
| marta-north-avenue-station | MARTA North Avenue Station | transport | OSM node 69286902 (David research) | exact |
| marta-midtown-station | MARTA Midtown Station | transport | OSM node 69286872 (David research) | exact |

## Coincidencias y campos completados

| Investigación | POI conservado | Campos completados | Fuente de los campos |
| --- | --- | --- | --- |
| brittain-dining-hall | brittain-dining-hall | hours_note, buzzcard, url, dining_dollars, meal_swipes | https://dining.gatech.edu/location/brittain-dining-hall-0 |
| west-village-dining-hall | west-village-dining-hall | hours_note, buzzcard, url, dining_dollars, meal_swipes | https://dining.gatech.edu/location/west-village-dining-hall |
| big-chicken-jlsc | big-chicken-student-center | hours, hours_note, buzzcard, url, dining_dollars, meal_swipes | https://dining.gatech.edu/dining-locations |
| blenz-bowls-jlsc | blenz-bowls-student-center | hours, hours_note, buzzcard, url, dining_dollars, meal_swipes | https://dining.gatech.edu/dining-locations |
| financial-aid-office | scholarships-financial-aid | hours_note, buzzcard, floor_or_room | https://bursar.gatech.edu/PDF/Fall_2019_OSFA_and_Bursar_FASET.pdf |
| career-center | career-center | hours_note, buzzcard | https://career.gatech.edu/contact-us/ |
| office-of-international-education | office-international-education | hours_note, buzzcard, floor_or_room | https://oie.gatech.edu/directions |
| price-gilbert-print-studio | print-studio-price-gilbert | hours_note, buzzcard, url, floor_or_room | https://library.gatech.edu/print-studio |
| flowers-invention-studio | flowers-invention-studio | hours_note, buzzcard, url, floor_or_room | https://inventionstudio.gatech.edu/ |
| the-hive-makerspace | hive-makerspace | hours_note, buzzcard, url, floor_or_room | https://hive.ece.gatech.edu/ |
| yang-aero-maker-space | yang-aero-maker-space | hours, hours_note, buzzcard, url | https://ams.gatech.edu/faq/ |
| the-mill-mse-makerspace | mill-makerspace | hours, hours_note, buzzcard, url, floor_or_room | https://mill.mse.gatech.edu/take-a-t-make-a-t/ |
| bme-design-shop | bme-design-shop | hours, hours_note, buzzcard, floor_or_room | https://bmemakerspaces.com/ |
| campus-recreation-center | crc | hours_note, buzzcard, url, floor_or_room | https://crc.gatech.edu/hours/ |
| mcauley-competition-pool | crc-competition-pool | hours_note, buzzcard, url | https://crc.gatech.edu/hours/ |
| crawford-leisure-pool | crc-crawford-pool | hours_note, buzzcard, url | https://crc.gatech.edu/hours/ |
| crc-indoor-climbing-wall | crc-climbing-wall | hours_note, buzzcard, url | https://crc.gatech.edu/hours/ |
| stamps-health-services | stamps-health-services | hours_note, buzzcard | https://health.gatech.edu/hours/ |
| stamps-pharmacy | stamps-pharmacy | hours, hours_note, buzzcard, url | https://health.gatech.edu/contact-us/ |
| cmhcr-smithgall | mental-health-care-resources | hours_note, buzzcard, url, floor_or_room | https://mentalhealth.gatech.edu/about/hours-operation |

## Amenities por subtipo

- atm: 1
- chapel/reflection-room: 2
- group-study-room: 3
- lactation-room: 15
- lockers: 1
- quiet-study: 2
- study-space: 3

## Omisiones por motivo

- 3: Nombre existente, pero edificio distinto o no confirmado; conservar el POI curado.
- 3: Sin coordenada OSM confirmada/precisa ni huella de edificio inequívoca.
- 12: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.

## Revisión humana: omitidos

- dunkin-jlsc: Nombre existente, pero edificio distinto o no confirmado; conservar el POI curado.
- panda-express: Nombre existente, pero edificio distinto o no confirmado; conservar el POI curado.
- kaldis-coffee-campus: Nombre existente, pero edificio distinto o no confirmado; conservar el POI curado.
- library-archives-special-collections: Sin coordenada OSM confirmada/precisa ni huella de edificio inequívoca.
- paper-and-clay: Sin coordenada OSM confirmada/precisa ni huella de edificio inequívoca.
- e82-centergy-parking-deck: Sin coordenada OSM confirmada/precisa ni huella de edificio inequívoca.
- stinger-stop-weber-ferst-shelter: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-clough-commons: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-midtown-marta: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-publix-spring-st: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-fifth-street: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-couch-park: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-ferst-hemphill: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-center-st-hemphill: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-gtpd: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-paper-tricentennial: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-cherry-emerson: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.
- stinger-stop-nara-science-square: Parada Stinger/bus: cubierta por la capa de tránsito en vivo.

## Revisión humana: precisión de edificio

- tech-square-tavern: building centroid: georgia-tech-hotel-and-conference-center; ubicar el local/sala/entrada antes de verificar.
- collective-food-hall-coda: building centroid: coda; ubicar el local/sala/entrada antes de verificar.
- coc-tso-help-desk: building centroid: college-of-computing-building; ubicar el local/sala/entrada antes de verificar.
- oit-asc-walk-up-support: building centroid: g-wayne-clough-undergraduate-learning-commons; ubicar el local/sala/entrada antes de verificar.
- jlsc-information-desk: building centroid: john-lewis-student-center; ubicar el local/sala/entrada antes de verificar.
- georgia-tech-post-office: building centroid: john-lewis-student-center; ubicar el local/sala/entrada antes de verificar.
- scec-event-services-office: building centroid: john-lewis-student-center; ubicar el local/sala/entrada antes de verificar.
- buzzcard-center: building centroid: john-lewis-student-center; ubicar el local/sala/entrada antes de verificar.
- bursars-office: building centroid: lyman-hall-building; ubicar el local/sala/entrada antes de verificar.
- office-of-disability-services: building centroid: flag-building-charles-a-smithgall-jr-building; ubicar el local/sala/entrada antes de verificar.
- pts-customer-service-center: building centroid: technology-square-parking-deck; ubicar el local/sala/entrada antes de verificar.
- crosland-grove-printers: building centroid: dorothy-murray-crosland-tower; ubicar el local/sala/entrada antes de verificar.
- crosland-2f-bw-printer: building centroid: dorothy-murray-crosland-tower; ubicar el local/sala/entrada antes de verificar.
- crosland-6f-gsc-color-printer: building centroid: dorothy-murray-crosland-tower; ubicar el local/sala/entrada antes de verificar.
- price-gilbert-3f-purple-zone-printer: building centroid: price-gilbert-memorial-library; ubicar el local/sala/entrada antes de verificar.
- clough-2f-color-printer: building centroid: g-wayne-clough-undergraduate-learning-commons; ubicar el local/sala/entrada antes de verificar.
- clough-3f-pink-zone-printer: building centroid: g-wayne-clough-undergraduate-learning-commons; ubicar el local/sala/entrada antes de verificar.
- clough-4f-bw-printer: building centroid: g-wayne-clough-undergraduate-learning-commons; ubicar el local/sala/entrada antes de verificar.
- ccb-1f-pharos-printer: building centroid: college-of-computing-building; ubicar el local/sala/entrada antes de verificar.
- ccb-ground-pharos-printer: building centroid: college-of-computing-building; ubicar el local/sala/entrada antes de verificar.
- klaus-ece-public-lab-printers: building centroid: christopher-w-klaus-advanced-computing-building; ubicar el local/sala/entrada antes de verificar.
- van-leer-c257-ece-lab-printer: building centroid: van-leer-building; ubicar el local/sala/entrada antes de verificar.
- architecture-west-359a-plotters: building centroid: architecture-west; ubicar el local/sala/entrada antes de verificar.
- pharmabox-clough: building centroid: g-wayne-clough-undergraduate-learning-commons; ubicar el local/sala/entrada antes de verificar.
- cmhcr-cos-mose-1120b: building centroid: glen-p-robinson-jr-building; ubicar el local/sala/entrada antes de verificar.
- w02-student-center-parking-deck: building centroid: student-center-parking-deck; ubicar el local/sala/entrada antes de verificar.
- w22-dalney-parking-deck: building centroid: dalney-street-parking-deck; ubicar el local/sala/entrada antes de verificar.
- e81-tech-square-parking-deck: building centroid: technology-square-parking-deck; ubicar el local/sala/entrada antes de verificar.
- coda-parking-garage: building centroid: coda; ubicar el local/sala/entrada antes de verificar.
- w02-bike-room-fix-it: building centroid: student-center-parking-deck; ubicar el local/sala/entrada antes de verificar.
- w22-bike-room-fix-it: building centroid: dalney-street-parking-deck; ubicar el local/sala/entrada antes de verificar.

## Revisión humana: conflictos de horarios

- scholarships-financial-aid: se conserva {"mon":[["08:00","16:00"]],"tue":[["08:00","16:00"]],"wed":[["08:00","16:00"]],"thu":[["08:00","16:00"]],"fri":[["08:00","16:00"]],"sat":[],"sun":[]}; investigación {"mon":[["09:30","15:30"]],"tue":[["09:30","15:30"]],"wed":[["09:30","15:30"]],"thu":[["09:30","15:30"]],"fri":[["09:30","15:30"]],"sat":[],"sun":[]}.
- flowers-invention-studio: se conserva {"mon":[["10:00","16:00"],["17:00","18:00"]],"tue":[["10:00","16:00"],["17:00","18:00"]],"wed":[["10:00","16:00"],["17:00","18:00"]],"thu":[["10:00","16:00"],["17:00","18:00"]],"fri":[["10:00","16:00"]],"sat":[],"sun":[]}; investigación {"mon":[["10:00","16:00"]],"tue":[["10:00","16:00"]],"wed":[["10:00","16:00"]],"thu":[["10:00","16:00"]],"fri":[["10:00","16:00"]],"sat":[],"sun":[]}.
- crc: se conserva {"mon":[["05:30","23:59"]],"tue":[["05:30","23:59"]],"wed":[["05:30","23:59"]],"thu":[["05:30","23:59"]],"fri":[["05:30","21:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","22:00"]]}; investigación {"mon":[["05:30","24:00"]],"tue":[["05:30","24:00"]],"wed":[["05:30","24:00"]],"thu":[["05:30","24:00"]],"fri":[["05:30","21:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","22:00"]]}.
- crc-crawford-pool: se conserva {"mon":[["16:00","20:00"]],"tue":[["16:00","20:00"]],"wed":[["16:00","20:00"]],"thu":[["16:00","20:00"]],"fri":[["16:00","20:00"]],"sat":[["10:00","18:00"]],"sun":[["12:00","18:00"]]}; investigación {"mon":[["06:00","09:00"],["14:00","20:00"]],"tue":[["06:00","12:00"],["14:00","20:00"]],"wed":[["06:00","09:00"],["14:00","20:00"]],"thu":[["06:00","12:00"],["14:00","20:00"]],"fri":[["06:00","09:00"],["14:00","20:00"]],"sat":[["13:00","18:00"]],"sun":[["12:00","18:00"]]}.
- stamps-health-services: se conserva {"mon":[["08:00","16:30"]],"tue":[["08:00","16:30"]],"wed":[["08:00","16:30"]],"thu":[["09:00","16:30"]],"fri":[["08:00","16:30"]],"sat":[],"sun":[]}; investigación {"mon":[["08:00","17:00"]],"tue":[["08:00","17:00"]],"wed":[["08:00","17:00"]],"thu":[["09:00","17:00"]],"fri":[["08:00","17:00"]],"sat":[],"sun":[]}.

## Revisión humana: horarios incompatibles con el contrato

- crosland-grove-printers: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- crosland-2f-bw-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- crosland-6f-gsc-color-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- price-gilbert-3f-purple-zone-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- clough-2f-color-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- clough-3f-pink-zone-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- clough-4f-bw-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- klaus-ece-public-lab-printers: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- van-leer-c257-ece-lab-printer: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
- campus-recreation-center: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["05:30","24:00"]],"tue":[["05:30","24:00"]],"wed":[["05:30","24:00"]],"thu":[["05:30","24:00"]],"fri":[["05:30","21:00"]],"sat":[["09:00","19:00"]],"sun":[["09:00","22:00"]]}.
- pharmabox-clough: Horario no representable por el contrato (p. ej. 24:00); no se inventa 23:59. Original: {"mon":[["00:00","24:00"]],"tue":[["00:00","24:00"]],"wed":[["00:00","24:00"]],"thu":[["00:00","24:00"]],"fri":[["00:00","24:00"]],"sat":[["00:00","24:00"]],"sun":[["00:00","24:00"]]}.
