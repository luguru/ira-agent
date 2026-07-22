# Informe para reunion con responsables

Fecha: 2026-07-22
Proyecto: Radar A11y

## 1) Resumen ejecutivo

Radar A11y es una aplicacion local para auditar accesibilidad web de forma automatizada, generar evidencia trazable y facilitar seguimiento de mejoras.

Su valor principal es doble:

- Reducir tiempo de deteccion y priorizacion de incidencias de accesibilidad.
- Estandarizar el reporte tecnico y operativo para equipos de desarrollo, QA, UX y negocio.

La IA no sustituye la auditoria tecnica ni la validacion manual; actua como capa de explicacion y apoyo para acelerar lectura, priorizacion y comunicacion.

## 2) Que es y para que sirve

Radar A11y sirve para:

- Rastrear un sitio (URLs internas, con soporte de sitemap).
- Ejecutar chequeos de accesibilidad por URL y viewport usando Playwright + axe-core.
- Evaluar estados dinamicos con flows (menu, login, modales, etc.).
- Generar salidas tecnicas y de gestion en varios formatos.
- Comparar ejecuciones contra linea base para medir regresiones o mejoras.

Casos de uso tipicos:

- Validacion rapida antes de una release.
- Auditorias recurrentes en sprint.
- Evidencia para PR, QA y seguimiento inter-equipos.
- Deteccion temprana de deuda de accesibilidad en componentes compartidos.

## 3) Como esta hecha (arquitectura)

Stack:

- Runtime: Node.js
- Lenguaje: TypeScript
- Navegacion y ejecucion: Playwright
- Motor de accesibilidad: axe-core (@axe-core/playwright)
- Reporteria: HTML + CSS + JS y Markdown
- IA opcional: cliente OpenAI (activacion por variables de entorno)

Arquitectura funcional:

1. Entrada por CLI o por landing web local.
2. Carga y validacion de configuracion.
3. Rastreo de URLs (crawler).
4. Generacion de jobs URL x viewport.
5. Auditoria por job (axe + reglas custom + flows).
6. Persistencia incremental (NDJSON) y consolidado final (JSON).
7. Calculo de metricas y tendencia contra baseline.
8. Generacion de reportes (HTML y Markdown).
9. (Opcional) Generacion de resumen IA en archivo separado.

## 4) Flujo operativo de trabajo

Flujo recomendado para equipo:

1. Configurar alcance (baseUrl, include/exclude, maxPages, maxDepth, viewports, tags).
2. Ejecutar corrida rapida de validacion.
3. Ejecutar corrida completa.
4. Revisar reporte HTML para priorizar patrones de fallo.
5. Revisar tendencia para detectar regresion o mejora.
6. Asignar responsables y registrar avance.
7. Repetir ejecucion tras correcciones.

Salida por ejecucion:

- result.json: resultado consolidado
- results.ndjson: salida incremental
- trend.json: metricas y delta
- report.html / report.css / report.js: informe navegable
- informe-radar-a11y-automatico.md: resumen operativo
- resumen-ia.md: solo si IA esta habilitada

## 5) Controles de calidad, seguridad y gobierno

Controles incorporados:

- Validacion estricta de configuracion (tipos, limites, coherencia de flows y viewports).
- Restriccion de URL a HTTP/HTTPS y bloqueo de destinos locales/privados por defecto.
- Permite red privada solo en modo controlado (variable explicita de entorno).
- Control de progreso, cancelacion y manejo de errores amigables para usuario final.
- Trazabilidad historica por corrida (history.ndjson) para analisis de tendencia.

En resumen:

- La herramienta nace con un enfoque seguro para evitar uso accidental sobre destinos no permitidos.
- La operativa local reduce exposicion de datos y simplifica adopcion.

## 6) Limitaciones (importante para comunicar bien)

La auditoria automatica NO equivale a conformidad WCAG completa.
No sustituye pruebas manuales de:

- Navegacion por teclado
- Lectores de pantalla
- Orden de foco/lectura
- Calidad semantica y comprension real del contenido

Mensaje recomendado para responsables:
"Radar A11y reduce riesgo y acelera deteccion, pero el cierre de cumplimiento requiere validacion experta complementaria."

## 7) Que aporta la IA en este producto

Implementacion actual:

- IA opcional, desactivada por defecto.
- Se activa solo con ENABLE_AI_SUMMARY=true y clave de API.
- Si falla IA, la auditoria tecnica termina igual (no bloquea el proceso).
- El resultado IA se guarda aparte en resumen-ia.md.

Valor practico de la IA:

- Traduce hallazgos tecnicos a lenguaje de negocio.
- Resume patrones mas repetidos y criterios WCAG mas impactados.
- Acelera preparacion de reuniones y comunicacion con no tecnicos.
- Reduce tiempo de redaccion manual de conclusiones y recomendaciones.

Que no hace la IA:

- No reemplaza el resultado tecnico base.
- No "certifica" accesibilidad.
- No elimina la necesidad de revisiones manuales.

## 8) Impacto economico: coste de anadir IA

## 8.1 Costes directos

1. Coste por uso de API (variable):
   Coste por corrida = (Tokens entrada / 1,000,000 * Precio entrada) + (Tokens salida / 1,000,000 * Precio salida)

2. Coste de operacion:

- Gestion de claves y politicas de acceso
- Monitorizacion de consumo
- Mantenimiento de prompt/gobierno

3. Coste de riesgo/compliance (si aplica):

- Revision legal de datos enviados a terceros
- Politicas de retencion y anonimizado

## 8.2 Estimacion orientativa (sin fijar tarifa)

La implementacion actual envia un payload resumido (no el DOM completo), por lo que el consumo por corrida suele ser bajo/moderado.

Escenario orientativo de volumen:

- Entrada: 1,500 a 5,000 tokens por resumen
- Salida: 500 a 1,500 tokens por resumen

Ejemplo de calculo con precios de referencia:

- Si Precio entrada = Pin USD por 1M tokens
- Si Precio salida = Pout USD por 1M tokens

Entonces:
Coste minimo aprox/corrida = (1500/1e6 * Pin) + (500/1e6 * Pout)
Coste maximo aprox/corrida = (5000/1e6 * Pin) + (1500/1e6 * Pout)

Coste mensual = Coste por corrida * numero de corridas con IA

Conclusiones:

- El coste unitario suele ser bajo frente al coste-hora de perfiles senior.
- El impacto real depende de volumen y del modelo elegido.

## 8.3 Como justificar el gasto

La justificacion no debe ser "poner IA", sino:

- Disminuir tiempo de analisis y explicacion de hallazgos.
- Mejorar calidad y consistencia del mensaje a stakeholders.
- Reducir friccion entre equipos tecnico/no tecnico.
- Aumentar velocidad de decision para priorizar correcciones.

Si la IA ahorra, por ejemplo, 30-90 minutos por corrida en sintesis y comunicacion, el retorno suele superar con amplitud el coste de API.

## 9) Propuesta de adopcion por fases

Fase 1 (2-4 semanas): Piloto controlado

- Activar IA solo para un subconjunto de corridas.
- Medir tiempo invertido con y sin IA.
- Revisar calidad de los resumentes en comite tecnico.

Fase 2 (4-8 semanas): Escalado con gobierno

- Definir cuando ejecutar IA (ej. solo corridas completas o con umbral de incidencias).
- Establecer presupuesto mensual y alertas de consumo.
- Estandarizar plantilla de informe para comites.

Fase 3 (continuo): Optimizacion

- Ajustar modelo, longitud de salida y prompts.
- Reutilizar resumenes por baseline para minimizar llamadas.
- Auditar periodicamente precision y utilidad real.

## 10) KPIs para demostrar valor ante direccion

KPIs operativos:

- Tiempo medio de preparacion de informe por corrida.
- Tiempo desde corrida hasta plan de accion.
- Porcentaje de incidencias recurrentes en componentes compartidos.
- Tendencia mensual de incidencias (delta por sitio).

KPIs de IA:

- % corridas con IA habilitada.
- Coste medio por corrida con IA.
- Ahorro de tiempo estimado por corrida.
- Satisfaccion de stakeholders con la claridad del informe.

## 11) Riesgos y mitigaciones

Riesgo: sobreconfianza en IA.
Mitigacion: dejar por escrito que no sustituye validacion manual ni conformidad.

Riesgo: consumo descontrolado.
Mitigacion: limites por entorno, umbrales de ejecucion y seguimiento mensual.

Riesgo: datos sensibles en prompts.
Mitigacion: enviar solo agregados tecnicos, anonimizar y aplicar politica de minimizacion.

Riesgo: calidad variable de resumen.
Mitigacion: prompt versionado, revision humana y mejora continua.

## 12) Guion breve para la reunion (3-5 minutos)

Mensaje 1:
"Radar A11y nos da una base objetiva y repetible para detectar deuda de accesibilidad y medir tendencia en el tiempo."

Mensaje 2:
"La IA en este proyecto no toma decisiones tecnicas por nosotros; acelera la explicacion y comunicacion de resultados."

Mensaje 3:
"El coste de IA es variable y controlable. Lo justificamos por ahorro de tiempo de perfiles cualificados y mejor alineacion entre equipos."

Mensaje 4:
"Proponemos un piloto medible con KPIs de tiempo, coste y calidad antes de escalar."

## 13) Preguntas esperables y respuestas recomendadas

P: Esto certifica cumplimiento WCAG?
R: No. Aporta deteccion automatica y priorizacion. La certificacion requiere revision manual complementaria.

P: Si falla IA, se para todo?
R: No. La auditoria tecnica termina igual; IA es una capa opcional.

P: Cuanto cuesta al mes?
R: Depende de modelo y volumen. Se calcula por tokens, con presupuesto y alertas. En piloto medimos coste real por corrida.

P: Donde esta el retorno?
R: En menos tiempo de analisis y comunicacion, y en decisiones mas rapidas sobre que corregir primero.

## 14) Recomendacion final

Aprobar un piloto de IA acotado, con objetivos de negocio y control de consumo.
Si los KPIs confirman ahorro de tiempo y mejor comunicacion, escalar gradualmente.

La base tecnica de Radar A11y ya aporta valor por si sola; la IA multiplica ese valor cuando se gobierna con criterio.
