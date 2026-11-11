# Plan del hackathon · 14–15 noviembre 2026

Plan de alto nivel; mandan los horarios, reglas y entregables que confirme la organización en Salamanca.

## Antes de empezar a construir

- Los tres revisan las instrucciones oficiales y los recursos disponibles; anotan cualquier requisito que cambie el alcance.
- Mantener como base la primera demo acordada en `docs/GUIA_PRIMERA_DEMO.md`: selector de uno de tres lugares, fecha/hora UTC, posición geométrica del Sol/Tierra y panel con datos, fuente y límites.
- Reparto acordado: usuario coordina, integra y lleva backend; Diego ciencia/datos; Andrés interfaz. El equipo ajusta tareas a lo que el reto y el tiempo requieran.
- Stack previsto: TypeScript + React, Vite, React Three Fiber sobre Three.js; Vercel como alojamiento inicial. Si una pieza bloquea el progreso, elegir una alternativa conocida y seguir.

## Día 1 — sábado 14

1. Escuchar el briefing y confirmar entrega, evaluación, horarios y presentación.
2. Verificar que el recorrido acordado responde al reto; anotar cualquier cambio confirmado en `DECISIONES.md`.
3. Arrancar el esqueleto de la app y completar el recorrido vertical con el caso de muestra de Nobile Rim 1.
4. Integrar controles, visualización y datos de texto para que correspondan a la misma selección.
5. Si el recorrido básico está listo y queda tiempo, conectar la ruta del backend con Horizons y comprobar los campos devueltos.

**Objetivo al acabar el día:** poder abrir la app y completar el recorrido principal; las cifras de muestra deben identificarse como tales.

## Día 2 — domingo 15

1. Completar la conexión a Horizons si aún falta; revisar con Diego los parámetros y la interpretación de los resultados que se vayan a presentar.
2. Corregir estados de carga/error/datos ausentes. Si la red falla, valorar un fixture local claramente marcado como muestra; no presentarlo como consulta en vivo.
3. Añadir comparación de un segundo escenario solo si el recorrido principal funciona bien.
4. Confirmar los requisitos de entrega y presentación; preparar el relato entre todos. El usuario prevé hacer de portavoz.
5. Revisar fuentes, unidades, límites, licencia y versión final antes de entregar.

**Prioridad:** una demo clara y honesta del recorrido principal. Si no se valida un dato o método, reducir la afirmación y explicar el límite.
