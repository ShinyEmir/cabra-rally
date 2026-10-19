# Proyecto: juego de carrito por colinas (nombre: Cerro Arriba)

Lee docs/PLAN.md completo antes de hacer cambios. Es la fuente de decisiones.
reference/prototype.html es la fuente de verdad del comportamiento.

## Reglas
- Idioma: textos del juego en español de México. Código y nombres de variables en inglés.
- TypeScript con strict activado. Sin dependencias nuevas sin avisar.
- src/core no importa nada de render, input, ui ni audio.
- No usar emojis en el código, comentarios, commits ni mensajes.
- Trabajar una fase de docs/PLAN.md a la vez. No adelantar fases.
- Antes de cambiar la física, correr npm test. Después de cambiarla, correrlo otra vez.
- No copiar nombres, personajes, colores de equipo, logos ni arte de otros juegos.
- Cualquier recurso externo debe ser de licencia libre y anotarse en CREDITS.md.
- Al cerrar cada fase: correr npm test y npm run build, y hacer un commit.

## Comandos
- npm run dev: servidor de desarrollo
- npm test: pruebas con Vitest
- npm run build: versión de producción