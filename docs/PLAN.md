# Cabra Rally - Plan de desarrollo

Oct 17, 2026 · @Emir Castillo

Cabra Rally (nombre provisional) es un juego 2D de carrito por colinas con personajes de animales originales. Se desarrolla primero en web, sin costo, y después se empaqueta para Android e iOS.

## Resumen y decisiones

El juego se maneja con dos botones (gas y freno). El puntaje sube con volteretas en el aire, tiempo en el aire y caballitos. Hay dos modos: libre (infinito, solo puntos) e historia (recoger amigos en el camino y llevarlos al estadio).

Decisiones ya tomadas por Emir:

- **Personajes:** animales propios y originales. No se usan mascotas, nombres, colores ni logos de ningún club o marca.
- **Plataforma:** web primero, instalable en el teléfono como PWA. Android e iOS después, con la misma base de código.
- **Costo:** cero al inicio. Hosting gratis y sin tiendas hasta que el juego esté listo.
- **Motor:** sin motor de juego. TypeScript y Canvas 2D, reutilizando la física propia que ya existe en el prototipo.
- **Referencia de género:** juegos tipo Hill Climb y el minijuego de carrito de Pou. Solo se toma la idea de jugabilidad, nunca arte ni nombres de otro juego.

Prototipo de referencia: un solo archivo HTML (`reference/prototype.html` en el repositorio). Contiene la física probada, el terreno, el puntaje y los dos modos. Es la fuente de verdad del comportamiento; el proyecto nuevo debe igualarlo antes de cambiar nada.

## Stack y qué instalar

Para la fase web solo hacen falta cinco herramientas, todas gratis. Godot y Android Studio no se necesitan todavía.

| Herramienta | Para qué sirve | Versión |
| --- | --- | --- |
| Node.js (LTS) | Ejecutar Vite, TypeScript y las pruebas | 22 o más nueva |
| Git | Guardar versiones del proyecto | Cualquiera reciente |
| Cuenta de GitHub | Respaldo del código y hosting gratis | Gratis |
| Visual Studio Code | Editor para revisar y editar | Última estable |
| Claude Code | Escribir y probar el código en el proyecto | Última, según la guía oficial |

Verificación después de instalar, en una terminal:

```bash
node --version
npm --version
git --version
```

Librerías del proyecto (las instala Claude Code, no hay que hacerlo a mano):

- **Vite** como servidor de desarrollo y empaquetador.
- **TypeScript** para evitar errores en la física y el puntaje.
- **Vitest** para pruebas de la física sin abrir el navegador.
- **vite-plugin-pwa** para que se instale como app en el teléfono.

No se usa Phaser, Matter.js ni otro motor. La física del carro es propia, con suspensión por resortes, y ya está probada en el prototipo. Meter un motor obligaría a reescribirla y a perder el comportamiento actual.

Crear el proyecto base:

```bash
npm create vite@latest cabra-rally -- --template vanilla-ts
cd cabra-rally
npm install
npm install -D vitest vite-plugin-pwa
```

Después, el hosting gratis: Cloudflare Pages, Netlify o GitHub Pages, conectados al repositorio de GitHub.

## Estructura del proyecto

La regla central: la física y las reglas del juego no tocan el navegador. Así se pueden probar con Vitest en segundos y después reusar si el juego se empaqueta para tiendas.

```text
cabra-rally/
  docs/
    PLAN.md               Este documento
  reference/
    prototype.html        Prototipo original, solo lectura
  src/
    core/                 Sin DOM ni canvas
      math.ts             clamp, smooth, TAU (compartidos por terreno y física)
      physics.ts          stepCar, newCar, constantes PHY
      terrain.ts          terrain(x, td), slopeAt(x, td), kickerAt(k, td), TerrainConfig
      scoring.ts          volteretas, aire, caballito, aterrizaje
      modes.ts            Libre e Historia (reglas y parámetros)
      rng.ts              hash01 determinista
    render/               Solo dibujo
      draw-world.ts       Fondo, terreno, monedas, estadio
      draw-car.ts         Carro y pasajeros
      draw-animal.ts      Animales (conductor y amigos)
      particles.ts
    input/
      pedals.ts           Botones táctiles con pointer events
      keyboard.ts
    ui/
      screens.ts          Menú, pausa, resultados, HUD
    audio/
      sfx.ts              Web Audio, inicia tras un toque
    game.ts               Bucle principal y máquina de estados
    main.ts
  tests/
    physics.test.ts
    parity.test.ts        Corre la física del prototipo junto al port y compara cada paso
    scoring.test.ts
  CLAUDE.md               Reglas para Claude Code
```

Máquina de estados del juego: `menu`, `play`, `paused`, `crash`, `over`. El bucle de física corre con paso fijo de 1/240 s, acumulando el tiempo de cada cuadro, con un máximo de 40 pasos por cuadro. El dibujo corre a la frecuencia de la pantalla.

Reglas de código:

- Todo en TypeScript con `strict` activado.
- `core/` no importa nada de `render/`, `input/`, `ui/` ni `audio/`.
- Las constantes de ajuste viven en un solo objeto por módulo, sin números sueltos en la lógica.
- Sin emojis en el código ni en los comentarios.

## Física del carro

La física ya funciona y está probada en el prototipo. El proyecto nuevo debe portarla tal cual a `src/core/physics.ts` y solo después ajustarla. En el prototipo está entre los comentarios `PHYSICS-START` y `PHYSICS-END`.

Unidades: metros, segundos y radianes. El eje Y sube. La masa vale 1, así que las fuerzas se tratan como aceleraciones.

**Estado del carro:** posición `x, y`, ángulo `a`, velocidad `vx, vy`, velocidad angular `w`, dos ruedas (contacto y extensión de suspensión), tiempo en el aire `air` y un contador `stuck`.

**Carro nuevo** (`newCar(x)`): aparece en `y = terrain(x) + 1.05`, quieto y con ángulo 0, y cae sobre sus resortes en los primeros pasos. La rueda 0 es la trasera y la 1 la delantera.

**Cada paso (1/240 s):**

1. Para cada rueda se calcula el punto bajo la rueda a lo largo del eje local del carro. Hay contacto si el terreno queda por encima de ese punto. La compresión `d` es la diferencia.
2. Fuerza normal: `Fn = k*d - c*vn`, donde `vn` es la velocidad de la rueda sobre la normal del terreno. Si `d` pasa de `maxTravel` se suma `600*(d - maxTravel)`. `Fn` nunca es negativa.
3. Tracción `Ft` a lo largo de la pendiente:
   - Gas: `engine * thr * max(0, 1 - max(0, vf)/vmax)`.
   - Freno con el carro avanzando (`vf` mayor que 0.4): `-brake`.
   - Freno casi detenido: reversa, `-reverse * |thr| * max(0, 1 - max(0, -vf)/vrev)`.
   - Sin gas, o frenando mientras avanza: fricción pasiva `-clamp(vt*6, -cap, cap)`, con `cap = Fn*(0.08 + 0.5*max(0, 1 - |vt|))`.
   - Límite de adherencia: `|Ft|` no pasa de `mu * Fn`.
4. Las fuerzas de cada rueda suman a la fuerza del cuerpo y generan torque según el punto donde se aplican.
5. Gravedad `-g` en Y y arrastre `-vx*0.02` en X.
6. Torque extra: en el aire `airTorque*thr - w*airDamp`; con alguna rueda en el suelo `-w*0.5`.
7. Integración de Euler semiimplícita: primero velocidades, luego posiciones.

**Giro en el aire:** `thr` positivo (gas) hace girar el carro hacia atrás, con la nariz hacia arriba. `thr` negativo (freno) lo hace girar hacia adelante.

**Choque** (`stepCar` devuelve verdadero):

- La cabeza del conductor (círculo en `headX, headY` local, radio `headR`) toca el terreno.
- O el carro está boca abajo (`cos(a)` menor que -0.3), casi detenido (velocidad al cuadrado menor que 2), durante más de 1.2 s.

Tras un choque el carro sigue simulándose 0.9 s sin control y luego aparece la pantalla de resultados.

| Parámetro | Valor | Qué controla |
| --- | --- | --- |
| `g` | 9.8 | Gravedad |
| `k` | 150 | Rigidez de la suspensión |
| `c` | 16 (prototipo: 11) | Amortiguación de la suspensión |
| `maxTravel` | 0.5 | Recorrido máximo antes del tope duro |
| `r` | 0.4 | Radio de rueda |
| `s0` | 0.35 | Longitud libre de la suspensión |
| `wx`, `wy` | 0.85, 0.2 | Posición de las ruedas respecto al centro |
| `engine` | 6.2 | Fuerza del motor |
| `brake` | 5.5 | Fuerza de freno |
| `reverse` | 2.4 | Fuerza en reversa |
| `vmax`, `vrev` | 15, 5 | Velocidad máxima adelante y en reversa |
| `mu` | 1.25 | Coeficiente de adherencia |
| `inertia` | 1.1 | Resistencia al giro |
| `airTorque` | 9 (prototipo: 11) | Fuerza de giro en el aire |
| `airDamp` | 1.0 | Frenado del giro en el aire |
| `headX`, `headY`, `headR` | 0.15, 0.82, 0.3 | Cabeza del conductor |
| `dt` | 1/240 | Paso fijo de simulación |

**Ajuste pendiente de jugabilidad:** al primer intento el giro en el aire era demasiado rápido. Se bajó `airTorque` de 18 a 11 y `airDamp` de 0.25 a 1.0. Si aún se siente rápido, estos dos números son los primeros que hay que mover. Una voltereta completa debe seguir siendo posible en una rampa de modo libre (unos 1.4 s de aire).

Medido en la fase 1 con los valores actuales: con gas sostenido desde la salida, la primera rampa de modo libre (centro en x = 71.5) da 1.52 s de aire, pero el carro gira unos 508° (casi 1.4 vueltas hacia atrás) y cae de cabeza, con choque en x = 86.2 a los 7.8 s. Soltando el gas al despegar también choca, más adelante (x = 103.8). Es la primera evidencia para la fase 3: con gas sostenido el giro todavía se pasa de una vuelta.

**Registro de cambios de la fase 3** (cada cambio con las pruebas corridas antes y después):

| Fecha | Parámetro | Antes | Después | Motivo y efecto medido en la primera rampa (1.5 s de aire) |
| --- | --- | --- | --- | --- |
| 2026-10-17 | `airTorque` | 11 | 8 | Emir sintió los giros raros. Con gas sostenido pasa de 471° y choque a 342° (una voltereta) y aterriza; con freno, de 406° a 303°; sin pedal no cambia (30°). |
| 2026-10-18 | `c` | 11 | 16 | Emir sintió que rebota mucho al aterrizar. En partidas simuladas los rebotes tras aterrizar bajan de 4 de 17 (hasta 0.42 s en el aire otra vez) a 0 o 1. También baja el empujón de giro al pasar el borde de la rampa (sin pedal, de 30° a 20°). |
| 2026-10-18 | `airTorque` | 8 | 9 | Compensa el cambio de `c`: con gas sostenido la primera rampa vuelve a dar una voltereta y aterriza (344°, antes 342°). |
| 2026-10-18 | Contacto de carrocería (nuevo) | sin contacto | 5 círculos, dureza 800, amortiguación 34, fricción 0.5 | La carrocería se metía hasta 1.5 m en el suelo al aterrizar de nariz o de cola y al pegar contra la bajada de una rampa. Ahora raspa: el hundimiento queda por debajo de 0.3 m. Vive en `DEFAULT_CAR_SHAPE` (`src/core/vehicle.ts`), no en `PHY`. |

Las pruebas de paridad copian estos valores al código del prototipo antes de comparar, y una prueba exige que la lista `TUNED` de `tests/parity.test.ts` coincida con esta tabla.

**Pendientes de ajuste** (anotados por Emir el 2026-10-18; la fase 3 sigue abierta y se ajusta con el tiempo):

- **Rebote al aterrizar:** atendido el 2026-10-18 (`c` de 11 a 16 y contacto de carrocería). Falta que Emir lo confirme en el teléfono.
- **Hitbox:** desde el 2026-10-18 es un dato por personaje (`CarShape` en `src/core/vehicle.ts`): la cabeza del conductor (se dibuja y choca en el mismo círculo), zonas de choque extra (orejas, sombreros) y los círculos de la carrocería que raspan sin chocar. La regla de boca abajo y detenido sigue igual. En el panel `?ajuste` se pueden ver las zonas y cambiar el tamaño de la cabeza. En la fase 5 cada `AnimalSpec` trae su propia forma.
- **Cámara:** sin quejas hasta ahora; falta confirmarla con calma (perilla "Cámara: alejar" del panel).

**Pruebas automáticas que debe cumplir `physics.test.ts`:**

- Carro quieto sobre terreno plano: se asienta en `y` cercano a 0.92 sin desplazarse (el prototipo da 0.9173 = 0.95 - g/(2k)).
- Gas sostenido en plano: velocidad cercana a 12 m/s a los 2 s (el prototipo da 11.9; se acepta de 10.5 a 12.5), nunca mayor que `vmax`. La versión anterior de este documento decía 11.
- Ningún valor se vuelve `NaN` o infinito en 60 s de simulación con cualquier combinación de gas y freno.
- Una rampa de modo libre da más de 1 s de aire con gas sostenido.

**Paridad con el prototipo (`parity.test.ts`, también `npm run compare`):** extrae el bloque `PHYSICS-START`/`PHYSICS-END` del prototipo, lo ejecuta junto al port con la misma entrada durante 60 s y exige el mismo estado completo en cada paso, con igualdad exacta. Escenarios: modo libre con gas sostenido, modo libre mixto, historia mixto y plano mixto. Tras un choque se sigue simulando sin control, como en el bucle del prototipo. Si se cambia un parámetro de física a propósito, esta prueba deja de servir tal cual: hay que comparar contra el prototipo con el mismo cambio o retirarla de forma explícita.

## Terreno, modos y puntaje

### Terreno

El terreno es una función `terrain(x)` determinista: la misma `x` siempre da la misma altura, sin guardar nada. Se compone de tres ondas senoidales más rampas de lanzamiento.

```text
f    = smooth((x - 8) / 24)                      // arranque plano
ramp = clamp((x - 20) / 260, 0, 1)               // la dificultad sube con la distancia
A    = (0.45 + 1.35 * ramp) * amp
h    = A * (sin(0.11x) + 0.45*sin(0.27x + 1.7) + 0.15*sin(0.61x + 0.4)) * f

Rampas de lanzamiento (solo si kick > 0 y x > 50):
  k       = floor((x - 53) / 48)                 // una rampa por ventana de 48 m
  centro  xc = 60 + 48*k + hash01(k)*14
  altura  H  = (1.5 + min(1.7, 0.15*k)) * kickH
  subida  entre xc-5 y xc    : + H * smooth((x - xc + 5) / 5)
  bajada  entre xc y xc+1.6  : + H * (1 - smooth((x - xc) / 1.6))

Aplanado final (si x > flatFrom):
  h *= 1 - smooth((x - flatFrom) / 20)          // llega a plano 20 m después
```

`smooth(t)` es `t*t*(3 - 2t)` con `t` limitado entre 0 y 1. `hash01(n)` es `frac(sin(127.1n + 311.7) * 43758.5453)`, un número fijo entre 0 y 1 a partir de `n`. La pendiente se calcula numéricamente con una diferencia de 0.04 m a cada lado.

La configuración del terreno es un objeto `TerrainConfig` con cuatro campos: `amp`, `kick` (rampas activas si es mayor que 0), `kickH` y `flatFrom`. En el prototipo era un objeto global `TD`; en `src/core` se pasa como parámetro. El valor por omisión `{ amp: 1, kick: 1, kickH: 1, flatFrom: 1e9 }` es el de modo libre.

### Modo libre

- Infinito. Solo el carro y los puntos.
- `amp = 1`, `kickH = 1`, sin zona final.
- Monedas en tramos de 5 a 7 cada 34 a 64 m, más arcos de 4 monedas sobre cada rampa.
- El mejor puntaje se guarda en `localStorage` bajo la clave `cabra-rally-best`. Si el almacenamiento falla, el juego sigue sin guardar.

### Modo historia

- Nivel de 300 m con meta en `x = 300` y un estadio de fondo después de la meta.
- Terreno más suave: `amp = 0.75`, `kickH = 0.7`, y se aplana desde `x = 260` (`flatFrom = 260`; queda plano en `x = 280`).
- 6 amigos en `x = 45, 95, 140, 185, 230, 268`. Se recogen al acercarse y viajan en la caja. La distancia se mide del centro del carro al punto `(x, terrain(x) + 0.6)` del amigo y debe ser menor que la raíz de 3.4 (unos 1.84 m).
- Al cruzar la meta: pantalla de victoria y bono de 200 puntos por cada amigo a bordo.
- Cada nivel futuro cambia `amp`, `kickH`, el largo y la lista de amigos. Eso debe vivir en datos, no en código.

### Puntaje

| Evento | Puntos | Condición |
| --- | --- | --- |
| Voltereta | 100 x número de voltereta en el mismo salto | Giro acumulado de 0.9 vueltas por cada voltereta (se cuenta hacia adelante o hacia atrás) |
| Tiempo en el aire | 50 por segundo completo | El salto empieza tras 0.12 s sin ruedas en el suelo y los segundos se cuentan desde ahí, así que el primer bono llega a 1.12 s de aire |
| Aterrizaje limpio | 50 | Salto de más de 0.9 s contados desde que empieza (más de 1.02 s de aire en total) y ángulo final dentro de 0.5 rad |
| Caballito | 10 cada 0.6 s | Solo la rueda trasera en el suelo |
| Bono de meta (historia) | 200 por amigo | Al cruzar la meta |

Las monedas se cuentan aparte y no suman puntos por ahora. Se reservan para una tienda de personajes en una fase posterior.

Textos flotantes de puntaje: `Voltereta atrás`, `Voltereta adelante`, `Doble ...`, `Triple ...`, `Tiempo en el aire`, `Aterrizaje limpio`, `Caballito`.

## Controles y pantallas

El juego se diseña para teléfono en horizontal. Un pulgar sobre cada pedal, sin menús durante la partida.

### Controles

| Entrada | Acción |
| --- | --- |
| Pedal derecho (GAS) | Acelera en el suelo. En el aire, gira hacia atrás |
| Pedal izquierdo (FRENO) | Frena o va en reversa. En el aire, gira hacia adelante |
| Teclado: flecha derecha, D, flecha arriba, espacio | Gas |
| Teclado: flecha izquierda, A, flecha abajo | Freno |
| R | Reiniciar la partida |
| Esc o P | Pausa |

Los pedales usan `pointerdown`, `pointerup`, `pointercancel` y captura del puntero, para que dos dedos funcionen a la vez y soltar fuera del botón no deje el pedal pegado. Se bloquea el menú contextual, la selección de texto y el zoom por doble toque. Si la ventana pierde el foco, el juego se pausa y se sueltan ambos pedales.

### Pantallas

- **Menú:** nombre del juego, botón Modo libre, botón Historia, mejor puntaje del modo libre, aviso para girar el teléfono si está vertical. El carro se asienta en la primera colina detrás del menú.
- **HUD durante la partida:** puntaje grande arriba a la izquierda, distancia y monedas debajo, botón de pausa arriba a la derecha. En historia, un contador de amigos y una barra de progreso hacia el estadio.
- **Textos flotantes:** hasta 4 a la vez, suben y se desvanecen en 1.3 s.
- **Pausa:** Seguir y Salir.
- **Resultados:** título (`Te volteaste` o `Llegaron al estadio`), puntaje, distancia, monedas, amigos (solo historia), etiqueta de nuevo récord, botones Otra vez y Menú.

### Reglas de interfaz

- Idioma de los textos: español de México.
- Área mínima tocable de los botones: 44 px. Los pedales miden al menos 88 px de ancho.
- Respetar los márgenes seguros del teléfono (notch y barra inferior) con `env(safe-area-inset-*)`.
- El lienzo ocupa toda la pantalla y se reescala con `devicePixelRatio`, con un máximo de 2.
- Con `prefers-reduced-motion` se acortan las animaciones de texto.

## Arte, audio y personajes

Todo el arte es propio y original. El prototipo dibuja una cabra provisional con Canvas; esa cabra se reemplaza por animales distintos antes de publicar nada.

### Reglas para evitar problemas de derechos

- Ningún personaje, nombre, color de equipo, logo ni diseño de carro copia a otro juego o club.
- Evitar la combinación rojo, blanco y azul como identidad visual. La paleta del prototipo (naranja, verde azulado, crema, tinta oscura) ya es distinta y se conserva.
- El estadio es genérico y sin nombre ni escudo.
- Todo recurso externo (fuente, sonido, imagen) debe ser propio o de licencia libre verificable (CC0 o equivalente) y se anota en `CREDITS.md` con su origen.

### Reparto de animales

Propuesta inicial con fauna de México. Se puede cambiar, pero cada personaje debe distinguirse por su silueta, no solo por el color.

| Animal | Papel | Rasgo para dibujarlo |
| --- | --- | --- |
| Ajolote | Conductor por defecto | Branquias rosas a los lados de la cabeza, sonrisa ancha |
| Armadillo | Amigo 1 | Casco en bandas, hocico largo |
| Tlacuache | Amigo 2 | Cola larga, orejas redondas |
| Coatí | Amigo 3 | Nariz alargada, cola con anillos |
| Jaguar | Amigo 4 | Manchas, orejas pequeñas |
| Tucán | Amigo 5 | Pico grande y colorido |
| Colibrí | Amigo 6 | Pico fino, tamaño pequeño |

El conductor se elegirá en una pantalla de personajes en una fase posterior. Las monedas servirán para desbloquear conductores nuevos.

### Estilo visual

- Vectores planos dibujados con Canvas 2D, contorno oscuro grueso (`#1f3a34`) y colores saturados. Igual que el prototipo.
- Cada animal se define como datos (`AnimalSpec`: colores, forma de orejas, hocico, cola, accesorio) y una sola función lo dibuja. Agregar un animal nuevo no debe requerir código nuevo de dibujo.
- El carro se rediseña como un vehículo propio y redondeado, distinto del rojo del juego de referencia. Mantiene las ruedas con suspensión visible.
- Fondo en tres capas de colinas con parallax, nubes y sol. Cada mundo futuro cambia la paleta (por ejemplo selva, desierto, costa).

### Audio

- Web Audio generado por código, sin archivos al inicio: motor con tono según la velocidad, moneda, voltereta, aterrizaje, choque y recoger amigo.
- El audio se activa solo después del primer toque del jugador (regla del navegador) y hay un botón de silencio que se guarda en `localStorage`.
- La música de fondo queda para una fase posterior, con pistas propias o de licencia libre.

## Fases de trabajo

Son 7 fases en orden. Cada una termina con criterios que se pueden comprobar, y no se pasa a la siguiente hasta cumplirlos. Claude Code debe hacer un commit de Git al cerrar cada fase.

| Fase | Objetivo | Se considera terminada cuando |
| --- | --- | --- |
| 0. Base | Proyecto Vite con TypeScript, Vitest y la estructura de carpetas. Copiar el prototipo a `reference/` | `npm run dev` abre una pantalla en blanco sin errores, `npm test` corre y pasa, y el repositorio está en GitHub |
| 1. Física | Portar `physics.ts`, `terrain.ts` y `rng.ts` al proyecto, sin dibujo | Las pruebas de la sección de física pasan. Un script simula 60 s y el resultado coincide con el prototipo (misma `x` final con la misma entrada) |
| 2. Modo libre | Dibujo, controles táctiles y de teclado, puntaje, monedas, menú, pausa y resultados | Se juega de principio a fin en un teléfono real. Cada tipo de puntaje se activa al menos una vez. El mejor puntaje se guarda y sobrevive a recargar |
| 3. Ajuste de sensación | Afinar giro, velocidad, agarre y cámara con pruebas de Emir en su teléfono | Emir confirma que el giro, la aceleración y la cámara se sienten bien. Los valores finales quedan en la tabla de parámetros |
| 4. Modo historia | Niveles basados en datos, amigos, estadio genérico, pantalla de victoria y selector de nivel | Al menos 5 niveles jugables y completables. Un nivel nuevo se agrega solo editando datos |
| 5. Personajes y arte | Animales originales, `AnimalSpec`, carro propio, fondos por mundo, pantalla de personajes, sonido | No queda ningún elemento del prototipo original (cabra, carro naranja). `CREDITS.md` completo |
| 6. Publicación web | PWA instalable, hosting gratis, dominio de prueba | Se instala desde el navegador del teléfono, abre sin internet y pasa Lighthouse con 90 o más en rendimiento y PWA |

Después de la fase 6 se decide, con el juego ya probado por otras personas, si se empaqueta para tiendas (ver la sección de publicación).

### Reglas de trabajo para todas las fases

- Una fase a la vez. No adelantar arte ni menús durante la fase de física.
- Antes de cambiar un parámetro de física, correr las pruebas. Después de cambiarlo, correrlas otra vez y anotar el cambio en esta tabla.
- Si algo del prototipo y este documento se contradicen, gana el prototipo, y se avisa a Emir para actualizar el documento.
- Cada fase se prueba también en un teléfono real, no solo en la computadora.

## Publicación

El juego sale primero como web gratuita e instalable, y solo después se evalúa pagar por las tiendas. Así Emir puede compartir el enlace con amigos desde el primer día sin gastar nada.

### Etapa 1: web gratis (fase 6)

- Hosting estático gratis: Cloudflare Pages, Netlify o GitHub Pages, conectado al repositorio. Cada `git push` publica solo.
- PWA con `manifest.webmanifest` (nombre, íconos de 192 y 512 px, `display: fullscreen`, `orientation: landscape`) y service worker generado por `vite-plugin-pwa`, para que funcione sin internet.
- En Android, Chrome ofrece instalar el juego. En iPhone no hay aviso automático: el jugador usa Compartir y luego Agregar a pantalla de inicio. La pantalla de menú debe explicarlo en una línea.
- Probar en Safari de iPhone y en Chrome de Android: el audio solo suena tras un toque, y `localStorage` puede estar vacío en navegación privada.

### Etapa 2: tiendas (solo si el juego lo amerita)

- El mismo proyecto web se empaqueta como app nativa con **Capacitor**, sin reescribir el juego.
- Android: se necesita Android Studio y una cuenta de Google Play Developer, con un pago único (alrededor de 25 USD; verificar el precio vigente).
- iPhone: se necesita una Mac con Xcode y una cuenta de Apple Developer, con pago anual (alrededor de 99 USD; verificar el precio vigente).
- Para ambas tiendas: política de privacidad publicada, clasificación por edades y capturas de pantalla. Si el juego no recolecta datos, la política es corta.
- Antes de subirlo, revisar el nombre del juego en las tiendas y en el registro de marcas, para no chocar con otro título.

### Monetización

No se incluye anuncios ni compras en esta versión. Si se agregan más adelante, se decide después de la fase 6 y cambia lo que piden las tiendas (declaración de datos y, en niños, reglas adicionales).

## Decisiones abiertas y riesgos

Las decisiones de la tabla no bloquean las fases 0 a 2. Claude Code debe usar la propuesta mientras Emir no diga otra cosa.

| Decisión | Propuesta actual | Se necesita antes de |
| --- | --- | --- |
| Nombre definitivo del juego | "Cabra Rally" es provisional y ya no encaja con animales variados. Buscar uno nuevo y revisar que no exista en las tiendas | Fase 5 |
| Conductor por defecto | Ajolote | Fase 5 |
| Idiomas | Solo español de México al inicio. Dejar los textos en un solo archivo para traducir después | Fase 6 |
| Orientación | Solo horizontal | Fase 2 |
| Número de niveles de historia | 5 al lanzar, más después con actualizaciones | Fase 4 |
| Monedas | Se cuentan y se guardan, sin tienda todavía | Fase 5 |
| Anuncios y compras | Ninguno en la primera versión | Después de la fase 6 |

| Riesgo | Qué puede pasar | Qué hacer |
| --- | --- | --- |
| Teléfonos lentos | La física a 240 pasos por segundo no alcanza y el juego se ve en cámara lenta | Limitar a 40 pasos por cuadro (ya está en el prototipo), medir en un teléfono modesto y bajar la frecuencia si hace falta, volviendo a ajustar los parámetros |
| Sensación de manejo | Cambiar un parámetro de física rompe el equilibrio de las rampas | Pruebas automáticas y cambiar un valor a la vez |
| Arte | Dibujar animales distintos con código toma más tiempo del esperado | Empezar con 3 animales y agregar el resto después |
| iPhone | Safari limita instalación, audio y pantalla completa | Probar en un iPhone real desde la fase 2 |
| Derechos | Parecerse demasiado al juego de referencia | Seguir las reglas de la sección de arte y revisar el parecido antes de publicar |

## Instrucciones para Claude Code

Para empezar: crear la carpeta del proyecto, guardar este documento como `docs/PLAN.md` (exportado en Markdown) y copiar el prototipo a `reference/prototype.html`. Después abrir Claude Code en esa carpeta y pegar el texto de abajo.

### Archivo CLAUDE.md

Guardarlo en la raíz del proyecto. Claude Code lo lee en cada sesión.

```markdown
# Proyecto: juego de carrito por colinas (nombre provisional: Cabra Rally)

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
```

### Prompt inicial

```text
Lee PLAN.md y reference/prototype.html completos. Vamos a construir el juego
en web con Vite, TypeScript y Canvas 2D, siguiendo las fases del plan.

Empieza solo por la fase 0 (base del proyecto) y la fase 1 (física):
1. Crea el proyecto con la estructura de carpetas del plan.
2. Porta la física, el terreno y el generador pseudoaleatorio del prototipo a
   src/core, sin cambiar ningún valor ni fórmula.
3. Escribe las pruebas de física descritas en el plan y hazlas pasar.
4. Compara tu simulación con la del prototipo (misma entrada, misma x final).

No dibujes nada todavía. Al terminar, resume qué quedó hecho, qué diferencias
encontraste entre el plan y el prototipo, y espera mi confirmación antes de
empezar la fase 2.
```

Para cada fase siguiente basta con pedir: "Continúa con la fase N del PLAN.md y cumple sus criterios de terminado".
