# Contexto para agentes

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
