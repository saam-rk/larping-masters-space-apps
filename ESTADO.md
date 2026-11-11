# Estado del proyecto

**Actualizado:** 2026-11-11 · **Reto oficial:** Lunar Landing Site Navigator · **Producto:** CLPS Lunar Mission Browser · **Implementación:** aún no iniciada.

## Acordado

- Equipo de tres: usuario coordina e integra, lleva backend y prevé presentar; Diego lleva ciencia/datos; Andrés interfaz.
- Demo inicial definida en `docs/GUIA_PRIMERA_DEMO.md`: tres lugares predefinidos, fecha/hora UTC, posición geométrica del Sol y la Tierra en una visualización 3D sencilla y un panel textual con unidades, fuente y límites. Nobile Rim 1 es el caso de muestra; el relieve no está modelado. Segundo escenario opcional.
- Stack base TypeScript + React. React Three Fiber sobre Three.js recomendado para la escena. Vite y Vercel son elecciones previstas; el alojamiento se puede cambiar durante el evento.
- Aplicación en español por defecto y también disponible en inglés. Código y artefactos técnicos del proyecto en inglés.
- Tope de DeepSeek: 10 €; saldo informado: 5 €.
- Todos están inscritos y tienen acceso al repositorio, según confirmación del usuario.
- El usuario informa que revisó `/subagents-models`, acceso a herramientas/modelos y el endpoint IA; esos preparativos se dan por completados.

## Decisiones aplazadas al hackathon

- Revisar con la organización los requisitos locales, agenda y entrega.
- Verificar con Diego los parámetros/método de Horizons cuando se implemente la conexión.
- Decidir entonces si se necesita un fixture local ante fallo de red, rotulado como simulación.
- No se harán prácticas previas de Git ni ensayo de presentación; el equipo preparará la demo conjuntamente.

## Repositorio y CI

- GitHub: `saam-rk/larping-masters-space-apps`, rama `main`; los documentos base se publicaron el 2026-11-11. El usuario confirma que Andrés y Diego tienen acceso.
- Aún no hay `package.json` ni aplicación. La skill compartida del hackathon se prepara en las rutas de proyecto de Claude Code y Codex.
- GitHub Actions se configurará cuando exista un proyecto con scripts reales para instalar, revisar tipos, lint, probar y compilar.

## Siguiente paso

Clonar el repositorio actualizado en la carpeta de trabajo definitiva y comprobar que la skill de proyecto está disponible en Claude Code y Codex. Después, al iniciar la app, añadir un workflow de CI que ejecute sus comprobaciones reales.

