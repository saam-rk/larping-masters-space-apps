# Contexto para agentes

## Proyecto
- Producto: **CLPS Lunar Mission Browser**, para el reto NASA Space Apps **Lunar Landing Site Navigator**. La primera demo permite elegir uno de tres puntos lunares y una fecha/hora UTC, y muestra posiciones geométricas del Sol y la Tierra en una vista 3D y un resumen con unidades, fuentes y límites. El relieve no está modelado; no presentes los resultados como garantía de energía, comunicaciones ni idoneidad de aterrizaje.
- Antes de proponer o ampliar alcance, consulta `ESTADO.md`, `DECISIONES.md` y el documento de tarea. Distingue lo confirmado de lo pendiente y no inventes datos científicos: conserva fuente, unidades, marco, método y limitaciones.
- Stack base: TypeScript + React; español predeterminado e inglés seleccionable. El usuario coordina, integra, lleva backend y hace el merge; Diego lleva ciencia/datos y Andrés interfaz.

## Ramas y pull requests
- Si la tarea requiere editar archivos, comprueba primero `git status` y la rama actual. Conserva cambios ajenos y no trabajes directamente en la rama base: actualízala y crea una rama propia por tarea antes de editar (`feat/<tema>`, `fix/<tema>` o `docs/<tema>`). Si ya estás en una rama de tarea adecuada, úsala.
- Si hay cambios previos en el árbol o no está clara la rama base/remoto, no limpies ni adivines: limita el trabajo seguro y consulta al integrador antes de una acción que pueda mezclar o publicar cambios.
- Mantén la PR acotada. Explica el objetivo, cómo validar, fuentes o métodos científicos afectados (o “no aplica”), límites y checks observados. No marques como pasados checks que no hayas ejecutado.
- Pide revisión a otra persona. El usuario integrador revisa y hace merge; autores no hacen merge ni publican por su cuenta. Agentes SI PUEDEN hacer merge si el autor se lo indica.  No hagas commit o push salvo que el encargo lo pida explícitamente.
- Sigue el procedimiento y la plantilla de `GIT_WORKFLOW.md`. Si contradice estas instrucciones, consulta al integrador antes de cambiar la rama base o publicar.

## Idioma del proyecto
- Escribe en inglés todo el código y los artefactos técnicos del proyecto: nombres de variables, funciones, tipos, comentarios, mensajes de interfaz internos, documentación técnica, archivos de configuración y mensajes de commit.
- La aplicación debe ofrecer español e inglés como idiomas seleccionables por la persona usuaria. El idioma predeterminado es español.
- Mantén traducible todo el texto visible de la aplicación; no fijes cadenas de interfaz directamente en componentes cuando exista una estructura de traducciones.
- Los prompts para agentes pueden estar en español o inglés. La lengua del prompt no cambia el idioma requerido para los archivos y resultados que se incorporen al proyecto: deben redactarse en inglés.
- Esta regla no obliga a traducir documentos de preparación del equipo que ya estén escritos en español; conserva su idioma salvo que se acuerde lo contrario.

Antes de cambiar código:
1. Lee `README.md`, `ESTADO.md` y `DECISIONES.md`; después el documento de la tarea.
2. Trata como acuerdos solo los hechos marcados en `DECISIONES.md`. Stack base: TypeScript + React; Vercel es el alojamiento previsto; el usuario coordina, integra y se encarga del backend; Diego lleva ciencia/datos; Andrés lleva interfaz. Para 3D se recomienda React Three Fiber sobre Three.js. El tope de DeepSeek es 10 €.
3. Si falta una decisión que afecta interfaces, datos o alcance, consúltala con el integrador; puedes avanzar en investigación que no la presuponga.
4. No inventes fórmulas, resultados, precios/disponibilidad de modelos, reglas del evento ni referencias. Registra fuente primaria, unidades, marco, versión y límites.
5. No ocultes incertidumbre ni conviertas ausencia de datos en cero. Sigue pruebas y convenciones existentes.
6. Trabaja en la tarea/archivos acordados y deja cambios revisables; un escritor por conjunto de archivos.
7. Protege claves y credenciales; no las incluyas en archivos, logs o prompts compartidos.
8. Al terminar, resume archivos tocados, evidencia, limitaciones y actualización propuesta para `ESTADO.md`/`DECISIONES.md`. No marques checks de ejecución que no hayas observado; las decisiones explícitas del usuario pueden registrarse como confirmadas por él.

Una persona responsable revisa cada diff. El usuario integra y hace merge de PR.
