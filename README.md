# NASA Space Apps Challenge — centro de operaciones

Equipo de 3 · Salamanca · 14–15 noviembre 2026  
Reto oficial: **Lunar Landing Site Navigator**. Nombre de trabajo del producto: **CLPS Lunar Mission Browser**.

## Cómo retomar

1. Lee [ESTADO.md](ESTADO.md) para conocer la próxima acción y bloqueos.
2. Lee [DECISIONES.md](DECISIONES.md) antes de cambiar un acuerdo.
3. Abre el documento de la tarea y trabaja en una unidad concreta.
4. Al cerrar, actualiza los acuerdos y el siguiente paso que realmente haya cambiado.

Para retomar con un agente: “Lee `README.md`, `AGENTS.md`, `ESTADO.md` y `DECISIONES.md`. Resume qué está acordado y cuál es el siguiente paso. No edites hasta que te indique la tarea.”

## Índice

- [Enunciado del reto — guía en español](ENUNCIADO_RETO.md)
- [Guía de la primera demo](docs/GUIA_PRIMERA_DEMO.md)
- [Arquitectura técnica](docs/ARCHITECTURE.md)
- [Plan del hackathon](PLAN_HACKATHON.md)
- [Decisiones](DECISIONES.md)
- [Estado](ESTADO.md)
- [Instrucciones para agentes](AGENTS.md)

## Desarrollo

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev     # app + /api/ephemeris en http://localhost:5173
npm run check   # tipos + lint + tests
npm run build   # build de producción en dist/
```

Estructura, responsables por carpeta, contrato de la API y límites: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Web Analytics

Vercel Web Analytics is mounted once in `src/main.tsx` using
`@vercel/analytics/react`. Enable **Web Analytics** in the Vercel project
dashboard, then deploy the branch through the normal review/deployment flow.
Visit the deployed app and check the project's **Analytics** tab for page views.
Local development uses the SDK's debug mode and does not record visits.
No custom events or mission inputs are sent by this integration.

Setup reference: [Vercel Web Analytics quickstart](https://vercel.com/docs/analytics/quickstart).

## Skills del proyecto

El asistente del hackathon está disponible como skill de proyecto para Codex en `.agents/skills/clps-hackathon-assistant/` y para Claude Code en `.claude/skills/clps-hackathon-assistant/`. Invócalo por nombre o deja que el agente lo seleccione por la tarea. Solo se comparte esta skill; las skills personales quedan fuera del repositorio.

El enunciado oficial enlazado prevalece sobre su guía en español. Las decisiones indican acuerdos del equipo; el plan se adapta a las reglas que confirme la organización.


