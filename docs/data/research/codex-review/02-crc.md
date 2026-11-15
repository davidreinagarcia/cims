<!-- summary: Codex review note (2026-11-14, in Spanish): CRC. -->
# CRC

Gemini acertó el edificio: lun-jue 05:30-24:00; vie 05:30-21:00; sáb 09:00-19:00; dom 09:00-22:00. [CRC hours](https://crc.gatech.edu/hours/) y [portada](https://crc.gatech.edu/) dicen «Fall 2026» y domingo 09:00. La [página central](https://students.gatech.edu/content/hours-operation) dice 10:00 y es contradictoria; la fuente departamental específica resuelve a favor 09:00.

El JSON contiene todos los servicios solicitados con fuentes y citas. Fitness Floor, Indoor Track y Main Gymnasium no tienen horario semanal propio publicado: no he heredado el del edificio por suposición. Con personal, Climbing Wall lun-jue 17:00-21:00 y vie 14:00-16:45. Member Services lun-jue 10:00-21:00, vie 10:00-18:00, sáb 11:00-18:00, dom 10:00-20:00.

[Competition Pool](https://crc.gatech.edu/hours/): lun/mié/vie 09:00-14:00; mar/jue 06:00-09:00 y 12:00-15:00; fin de semana cerrado para rec swim. Crawford separa calles y zona recreativa: esta última lun-vie 16:00-20:00, sáb 10:00-18:00, dom 12:00-18:00. El sábado de lap lanes permanece unconfirmed:13:00-18:00 figura tanto en la tabla como en la excepción del 14 nov. El JSON conserva las demás franjas de calles.

[Bike Shop](https://crc.gatech.edu/bike-shop/): lun-vie 14:00-18:00; sáb/dom unconfirmed porque no aparecen en la página actual. [Wilderness Outpost](https://crc.gatech.edu/wilderness-outpost/): lun-jue 14:00-19:00, vie 14:00-17:00, sin recogidas/devoluciones de fin de semana. El buscador devolvía cachés antiguas de ambas páginas, corregidas al abrirlas en navegador.

Excepciones de Thanksgiving y meet 14 nov separadas en JSON. No se han cargado como horas normales. Web fetch devolvía 502 y requests fallaba; las páginas se comprobaron mediante navegador. Fecha:2026-11-14.

Precisión de validación: Climbing Wall con personal y Wilderness Outpost tienen horas entre semana publicadas, pero no cierre general expreso de sábado/domingo. Sus semanas completas quedan `unconfirmed`; `published_weekday_hours` conserva lo conocido sin generar `[]` para días desconocidos. Wilderness sí declara que no admite recogidas/devoluciones de fin de semana.
