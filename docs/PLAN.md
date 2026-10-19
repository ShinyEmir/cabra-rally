# Cerro Arriba - Plan de desarrollo

Oct 17, 2026 · @Emir Castillo

Cerro Arriba (antes "Cabra Rally", nombre provisional) es un juego 2D de carrito por colinas con personajes de animales originales. Se desarrolla primero en web, sin costo, y después se empaqueta para Android e iOS.

## Resumen y decisiones

El juego se maneja con dos botones (gas y freno) por omisión, y cada jugador puede cambiar a pedales con flechas desde la pantalla de Controles. El puntaje sube con volteretas en el aire, tiempo en el aire y caballitos. Hay dos modos: libre (infinito, solo puntos) e historia (recoger amigos en el camino y llevarlos al estadio).

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
      levels.ts           Niveles de historia como datos
      progress.ts         Reglas de progreso de historia (desbloqueo, mejores resultados)
      run.ts              Una partida: paso fijo, monedas, amigos, meta, puntaje
      vehicle.ts          Forma de choque del carro y el conductor (por personaje)
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
| 2026-10-18 | Colisión sólida (nuevo) | la cabeza se revisaba en un punto y no era sólida | cabeza, zonas extra y carrocería como círculos contra la pendiente, y todos sólidos | Emir vio la cabeza meterse bajo el piso. Pasaba sobre todo en los 0.9 s que el carro sigue rodando tras el choque: la cabeza se hundía más de 2 m. Ahora queda por debajo de 0.2 m. En pendientes la cabeza choca cuando el círculo de verdad toca el piso, no solo el punto bajo su centro. |

Las pruebas de paridad copian estos valores al código del prototipo antes de comparar, y una prueba exige que la lista `TUNED` de `tests/parity.test.ts` coincida con esta tabla.

**Fase 3 cerrada el 2026-10-18.** Emir confirmó en su teléfono que el giro, la aceleración, el aterrizaje, la cámara y los controles se sienten bien. Los valores finales son los de la tabla de parámetros y de este registro. El panel `?ajuste` / `#ajuste` se queda como herramienta para ajustes futuros.

**Resultado de los ajustes de la fase 3:**

- **Rebote al aterrizar:** resuelto (`c` de 11 a 16 y contacto de carrocería). Confirmado por Emir.
- **Hitbox:** desde el 2026-10-18 es un dato por personaje (`CarShape` en `src/core/vehicle.ts`): la cabeza del conductor (se dibuja y choca en el mismo círculo), zonas de choque extra (orejas, sombreros) y los círculos de la carrocería que raspan sin chocar. Con `collision: "solid"` todos esos círculos se miden contra la pendiente y ninguno se hunde, ni después del choque. La regla de boca abajo y detenido sigue igual. En el panel `?ajuste` se pueden ver las zonas y cambiar el tamaño de la cabeza. En la fase 5 cada `AnimalSpec` trae su propia forma.
- **Cámara:** sin cambios respecto al prototipo; confirmada por Emir. La perilla "Cámara: alejar" del panel queda disponible.
- **Controles:** pantalla Controles con esquema clásico o pedales y flechas, lados, tamaño y opacidad (ver la sección Controles).

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

**Implementado en la fase 4 (2026-10-18):**

- Los niveles viven en `LEVELS` de `src/core/levels.ts`. Cada uno tiene `id` (fijo, guarda el progreso), `length`, `amp`, `kickH`, `seed` y `friends`. Agregar un nivel es agregar una entrada; su nombre va en `LEVEL_NAMES` de `src/ui/strings.ts` (si falta, se llama "Nivel N"). La meta queda en `x = length`, el terreno se aplana 40 m antes y el bono es de 200 por amigo, para todos los niveles.
- `seed` es nuevo (no está en el prototipo): desplaza las tres ondas y la posición de las rampas para que cada nivel tenga colinas propias. Con `seed = 0` el terreno es idéntico al del prototipo.
- El nivel 1 es el modo historia del prototipo valor por valor, y `tests/story-parity.test.ts` lo compara cuadro por cuadro (puntos, monedas, amigos, textos, estado del carro y del juego).

| Nivel | Nombre | Largo | `amp` | `kickH` | `seed` | Amigos |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Primer paseo | 300 m | 0.75 | 0.7 | 0 | 6 |
| 2 | Lomas del arroyo | 340 m | 0.85 | 0.8 | 1 | 6 |
| 3 | Cerro del viento | 380 m | 0.95 | 0.9 | 2 | 7 |
| 4 | Las barrancas | 420 m | 1.05 | 1.0 | 3 | 8 |
| 5 | La gran subida | 460 m | 1.15 | 1.1 | 4 | 9 |

- `tests/levels.test.ts` comprueba en cada nivel que los amigos están en orden, antes de la meta y fuera de las rampas, y que un piloto automático lo termina con todos los amigos. El nivel 5 ya no lo termina el piloto que siempre acelera; hace falta uno que afloje antes de las rampas.
- **Selector de nivel:** el botón Historia abre la lista de niveles, en una sola fila que se desliza con el dedo (agregar niveles solo la alarga, nunca obliga a desplazarse hacia abajo) y que se centra sola en el siguiente nivel por jugar. El primero está abierto y cada siguiente se abre al terminar el anterior. El progreso (completado, más amigos y mejor puntaje por nivel) se guarda en `localStorage` con la clave `cabra-rally-story`. Con `?ajuste` o `#ajuste` todos los niveles están abiertos, para probar.
- **HUD:** contador de amigos y barra de avance hacia el estadio. **Resultados:** "Llegaron al estadio" o "Te volteaste", con los amigos rescatados; al ganar aparece "Siguiente nivel", y el botón de salida regresa a la lista de niveles.
- Los amigos todavía son las cabras del prototipo ("Cabrito a bordo"); en la fase 5 se reemplazan por los animales del reparto.
- **Fase 4 cerrada el 2026-10-18.** Emir la probó en su teléfono: la dificultad sube bien, recoge a todos los amigos sin problema y el largo de los niveles está bien pensando en que vendrán más.

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

Los controles se configuran en la pantalla **Controles** (desde el menú y desde la pausa) y la elección se guarda en el teléfono (`localStorage`, clave `cabra-rally-controls`). Hay dos esquemas y un interruptor de lados; agregar más opciones es agregar datos en `src/input/scheme.ts`.

**Esquema clásico (por omisión, igual al prototipo):**

| Entrada | Acción |
| --- | --- |
| Pedal derecho (GAS) | Acelera en el suelo. En el aire, gira hacia atrás |
| Pedal izquierdo (FRENO) | Frena o va en reversa. En el aire, gira hacia adelante |
| Teclado: flecha derecha, D, flecha arriba, espacio | Gas |
| Teclado: flecha izquierda, A, flecha abajo | Freno |

**Esquema pedales y flechas** (propuesto por Emir el 2026-10-18): gas y freno solo avanzan y frenan; dos flechas inclinan el carro. En el aire la flecha hace girar con `airTorque`; en el suelo inclina con `LEAN.torque` = 9 (por debajo de unos 8 no alcanza a levantar la rueda delantera; con 9 un toque de medio segundo con gas levanta un caballito controlable y mantenerla unos 2 s voltea el carro).

| Entrada | Acción |
| --- | --- |
| GAS / FRENO (juntos en un lado) | Acelerar / frenar o reversa, sin girar |
| Flecha izquierda | Inclina hacia atrás (nariz arriba) |
| Flecha derecha | Inclina hacia adelante (nariz abajo) |
| Teclado: flecha arriba, W, espacio / flecha abajo, S | Gas / freno |
| Teclado: flecha izquierda, A / flecha derecha, D | Inclinar atrás / adelante |

**Lados:** en clásico, freno a la izquierda o gas a la izquierda; con flechas, pedales a la izquierda o flechas a la izquierda. Cambiar de lado solo mueve botones, nunca cambia lo que hacen.

**Tamaño y opacidad** (pedido por Emir el 2026-10-18, porque los botones estorbaban): tamaño Pequeño, Mediano o Grande (escala 0.72, 0.85 y 1; Grande es el tamaño original) y opacidad del 30% al 100%. Por omisión: Mediano al 65%. Un botón apretado se ve al 100%. Mientras la pantalla Controles está abierta, los botones se ven detrás de la tarjeta para notar el cambio.

| Siempre | Acción |
| --- | --- |
| R | Reiniciar la partida |
| Esc o P | Pausa |

Los pedales usan `pointerdown`, `pointerup`, `pointercancel` y captura del puntero, para que dos dedos funcionen a la vez y soltar fuera del botón no deje el pedal pegado. Se bloquea el menú contextual, la selección de texto y el zoom por doble toque. Si la ventana pierde el foco, el juego se pausa y se sueltan todos los botones. Las flechas miden al menos 72 px.

### Pantallas

- **Menú:** nombre del juego, botón Modo libre, botón Historia, mejor puntaje del modo libre, aviso para girar el teléfono si está vertical. El carro se asienta en la primera colina detrás del menú.

**Rediseño de la fase 5 (2026-10-18), siguiendo el orden de la referencia de Emir sin copiar su identidad:**

- **Inicio:** sin tarjeta al centro; el carro se ve en el camino. Arriba a la izquierda, una píldora con la cara del conductor (abre el perfil); arriba a la derecha, las monedas, sonido y controles. A la derecha, accesos a Personajes e Historia. El nombre y el récord quedan a la izquierda, y un botón grande "¡A correr!" abajo a la derecha abre la elección de modo.
- **Elegir modo:** dos globos de diálogo sobre un dibujo: Historia (amigos, con "N de 5 niveles") y Modo libre (tu carro, con tu récord).
- **Perfil y personajes:** a la izquierda tus datos (conductor, mejor puntaje, distancia máxima del modo libre, guardada en `cabra-rally-best-distance`); al centro un carrusel con flechas para elegir conductor, con la etiqueta "Seleccionado" y puntos de posición; a la derecha el carro con sus colores.
- **Barra superior común:** píldora de tinta para regresar y píldora con las monedas en todas las pantallas del menú. Las pantallas completas oscurecen y desenfocan el juego detrás, salvo Controles, que deja ver los botones como vista previa y acomoda sus ajustes en dos columnas.
- **Niveles:** cada tarjeta lleva una franja con los colores de su mundo.
- **HUD durante la partida:** puntaje grande arriba a la izquierda, distancia y monedas debajo, botón de pausa arriba a la derecha. En historia, un contador de amigos y una barra de progreso hacia el estadio.
- **Textos flotantes:** hasta 4 a la vez, suben y se desvanecen en 1.3 s.
- **Pausa:** Seguir y Salir.
- **Resultados:** título (`Te volteaste` o `Llegaron al estadio`), puntaje, distancia, monedas, amigos (solo historia), etiqueta de nuevo récord, botones Otra vez y Menú.

### Reglas de interfaz

- Idioma de los textos: español de México.
- Área mínima tocable de los botones: 44 px. En tamaño Grande los pedales miden al menos 88 px de ancho; en Mediano y Pequeño se reducen a petición del jugador, sin bajar de 44 px.
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

### Implementado en la fase 5 (2026-10-18)

- **Nombre:** Cerro Arriba, en `TEXT.title` de `src/ui/strings.ts`. Los textos ya no mencionan cabras: los amigos son "Amigos".
- **Reparto:** los 7 animales de la tabla viven como datos en `ANIMALS` de `src/core/animals.ts`. Cada uno combina piezas (orejas, hocico, marcas, cola, cuerpo, ojos), colores y el tamaño de su cabeza, que también es su zona de choque (`carShapeFor` en `src/core/vehicle.ts`). Una sola función los dibuja (`src/render/draw-animal.ts`): la cabeza para el conductor y los pasajeros, el cuerpo de pie para los amigos y la pantalla de personajes. Agregar un animal es agregar datos; solo una pieza nueva necesita código. Nombre y rasgo de cada uno en `ANIMAL_TEXT`. El "accesorio" del `AnimalSpec` queda para la tienda.
- **Amigos de historia:** todos menos el ajolote, en orden.
- **Carro propio:** buggy redondeado con barra antivuelco, amortiguadores visibles sobre las ruedas, llantas con taquetes, caja para pasajeros y una calcomanía de cerro. Cuatro colores, ninguno naranja ni rojo: azul laguna (por omisión), verde nopal, amarillo mango y morado jacaranda. Mantiene las medidas de la carrocería, así que la física no cambia.
- **Mundos:** `WORLDS` en `src/render/worlds.ts`, cada uno con cielo, sol, tres capas de colinas (o mar), suelo, pasto y siluetas: valle (árboles, modo libre y nivel 1), selva (nivel 2), costa con mar y palmeras (nivel 3), desierto con cactus (nivel 4) y atardecer con magueyes (nivel 5). Cada nivel elige su mundo con el campo `world`.
- **Pantalla de personajes:** desde el menú. Vista previa del carro con el conductor y el color elegidos, fila deslizable con los 7 animales y sus rasgos, y los colores del carro. La elección se guarda en `cabra-rally-garage`; también se muestran las monedas guardadas.
- **Sonido:** `src/audio/sfx.ts`, todo generado con Web Audio, sin archivos: motor con tono según la velocidad y el gas, moneda, voltereta (una nota más por cada voltereta del salto), tiempo en el aire, aterrizaje limpio, caballito, golpe al aterrizar, choque, recoger amigo y victoria. Arranca con el primer toque o tecla. Botón de silencio en la partida y en el menú, guardado en `cabra-rally-muted`.
- **Pulido del arte (pedido por Emir el 2026-10-18):** todas las figuras tienen la misma luz suave (brillo arriba atrás, sombra abajo) y contorno oscuro. Los animales ganaron ojos con destello, mejillas, colas y patas con forma, patrones en el cuerpo (bandas, rosetas, pecas) y sombra en el piso; los amigos saludan con una pata al frente. El carro tiene carrocería con curvas, guardafangos, rejilla, escape, parabrisas con reflejo, volante, asiento, rines con birlos y sombra en el piso que se encoge al saltar. El conductor se ve sentado, con el brazo (o el ala) en el volante.
- **Sin rastros del prototipo:** ya no hay cabra ni carro naranja en el juego.
- **Fase 5 cerrada el 2026-10-19.** Emir revisó en su teléfono los personajes, el carro, los mundos, el sonido y las interfaces nuevas. La paleta de la interfaz (naranja, verde azulado, crema, tinta) se conserva, como dice la sección de reglas.

## Fases de trabajo

Son 9 fases en orden (las fases 7 y 8 se agregaron después de publicar). Cada una termina con criterios que se pueden comprobar, y no se pasa a la siguiente hasta cumplirlos. Claude Code debe hacer un commit de Git al cerrar cada fase.

| Fase | Objetivo | Se considera terminada cuando |
| --- | --- | --- |
| 0. Base | Proyecto Vite con TypeScript, Vitest y la estructura de carpetas. Copiar el prototipo a `reference/` | `npm run dev` abre una pantalla en blanco sin errores, `npm test` corre y pasa, y el repositorio está en GitHub |
| 1. Física | Portar `physics.ts`, `terrain.ts` y `rng.ts` al proyecto, sin dibujo | Las pruebas de la sección de física pasan. Un script simula 60 s y el resultado coincide con el prototipo (misma `x` final con la misma entrada) |
| 2. Modo libre | Dibujo, controles táctiles y de teclado, puntaje, monedas, menú, pausa y resultados | Se juega de principio a fin en un teléfono real. Cada tipo de puntaje se activa al menos una vez. El mejor puntaje se guarda y sobrevive a recargar |
| 3. Ajuste de sensación | Afinar giro, velocidad, agarre y cámara con pruebas de Emir en su teléfono | Emir confirma que el giro, la aceleración y la cámara se sienten bien. Los valores finales quedan en la tabla de parámetros |
| 4. Modo historia | Niveles basados en datos, amigos, estadio genérico, pantalla de victoria y selector de nivel | Al menos 5 niveles jugables y completables. Un nivel nuevo se agrega solo editando datos |
| 5. Personajes y arte | Animales originales, `AnimalSpec`, carro propio, fondos por mundo, pantalla de personajes, sonido | No queda ningún elemento del prototipo original (cabra, carro naranja). `CREDITS.md` completo |
| 6. Publicación web | PWA instalable, hosting gratis, dominio de prueba | Se instala desde el navegador del teléfono, abre sin internet y pasa Lighthouse con 90 o más en rendimiento y PWA |
| 7. Retos y tienda | Darle uso a las monedas: tienda de accesorios y pinturas, y retos que dan monedas | Hay al menos 10 retos con progreso guardado y aviso al cumplirlos; la tienda vende al menos 6 accesorios y 3 pinturas; lo comprado se guarda y se ve en el juego; todo se agrega editando datos |
| 8. Más niveles y estrellas | Niveles 6 a 10 con mundos nuevos y tres estrellas por nivel para volver a jugarlos | Hay 10 niveles completables con todos los amigos (comprobado por pruebas), cada uno con su mundo; cada nivel da hasta 3 estrellas que se ven en la lista y en los resultados; las estrellas cuentan para retos; lo jugado antes da sus estrellas sin volver a jugar |

Después de la fase 6 se decide, con el juego ya probado por otras personas, si se empaqueta para tiendas (ver la sección de publicación).

### Fase 7: retos y tienda (agregada el 2026-10-19)

Propuesta aceptada por Emir tras cerrar la fase 6: las monedas se juntaban pero no servían para nada.

- **Tienda:** solo cosméticos, sin afectar la física ni la dificultad. Accesorios que se ven sobre el conductor (sombrero, lentes, paliacate, gorra, corona de flores, moño), definidos como datos y dibujados por una sola función, y pinturas nuevas para el carro. Se compran una vez con monedas y se equipan.
- **Retos:** metas cortas que se revisan al terminar cada partida (voltereta doble, distancia, monedas en una partida, tiempo en el aire, caballito largo, niveles de historia, rescatar a todos los amigos). Dan monedas al cumplirse y se avisa en la partida.
- **Se deja para después:** mejoras del carro que cambien la física, estrellas por nivel, desbloquear conductores con monedas.

**Hecho (2026-10-19):**

- **Retos:** 12 en `CHALLENGES` de `src/core/challenges.ts` (voltereta, voltereta doble, 2 y 3 segundos en el aire, caballito de 3 s, 30 y 100 monedas en una partida, 300 y 800 m en modo libre, 1 y 5 niveles, rescatar a todos los amigos). El texto sale del tipo y la meta (`challengeText`), así que un reto nuevo es solo una línea de datos. Se revisan cada cuadro durante la partida, con aviso "Reto cumplido" y sonido, y al terminar (los de historia). Se pagan una sola vez; se guardan los cumplidos y el mejor valor de cada uno en `cabra-rally-challenges`. Lo ya jugado cuenta: quien ya terminó niveles cobra esos retos al jugar la siguiente partida. Pantalla Retos con barra de progreso, y los retos del recorrido aparecen en los resultados.
- **Tienda:** solo cosméticos. 6 accesorios (`ACCESSORIES` en `src/core/shop.ts`, dibujados por `src/render/draw-accessory.ts` sobre cualquier animal) y 4 pinturas nuevas (turquesa, arena de playa, rosa mexicano, obsidiana). Comprar descuenta monedas, se guarda en `cabra-rally-shop` y se pone solo; los accesorios se quitan y se ponen, y las pinturas compradas aparecen también en Personajes. El accesorio se ve en el juego, en el inicio, en el perfil y en las vistas previas.
- **Inicio:** los accesos (Personajes, Tienda, Retos, Historia) quedan en una cuadrícula de 2 por 2.
- **Fase 7 cerrada el 2026-10-19.** Emir probó la tienda y los retos en el sitio publicado y todo funciona.

### Fase 8: más niveles y estrellas (agregada el 2026-10-19)

Siguiente paso propuesto tras la fase 7: con 5 niveles el modo historia se acaba rápido y no hay motivo para repetir un nivel ya terminado.

- **Niveles 6 a 10:** más largos, con colinas y rampas más altas, cada uno con una semilla de terreno que las pruebas comprueban que se puede terminar con todos los amigos. Siguen desbloqueándose en orden.
- **Mundos nuevos:** sierra con pinos y picos, milpas, pueblo de noche (luna, estrellas y casas con luz), paso nevado y faldas del volcán. Cada uno es datos en `WORLDS`, más el código de su silueta.
- **Estrellas:** tres por nivel: llegar al estadio, llegar con todos los amigos y alcanzar el puntaje meta del nivel (dato `scoreGoal`, que pide hacer trucos además de llevar a los amigos). Se calculan con el progreso ya guardado (mejor puntaje y más amigos), así que no hay clave nueva y lo jugado antes cuenta. Se ven en cada tarjeta, el total en la lista y en Modos, y en los resultados se marcan las nuevas.
- **Retos nuevos:** juntar estrellas y terminar los 10 niveles.
- **Se deja para después:** obstáculos nuevos en el terreno, mejoras del carro que cambien la física, desbloquear niveles con estrellas.

**Hecho (2026-10-19):**

- **Niveles 6 a 10** en `LEVELS`: Pinos de la sierra (500 m, 10 amigos), Entre milpas (540 m, 10), Pueblo de noche (580 m, 11), Paso nevado (620 m, 12) y Faldas del volcán (660 m, 13). Colinas de 1.2 a 1.4 y rampas de 1.15 a 1.35. Las semillas se eligieron probando muchas con los pilotos automáticos de las pruebas; se quedaron las que se terminan con todos los amigos. La física no cambió.
- **Mundos:** `far` en `WorldSpec` elige la capa lejana (colinas, mar, picos o volcán); `night` pone estrellas que parpadean y luna; `snow` pinta la punta de los picos; `propLight` es el segundo color de las siluetas (ventanas encendidas, elotes, nieve en los pinos). Siluetas nuevas: pino, milpa, casa y piedras. El volcán echa humo.
- **Estrellas** (`src/core/stars.ts`): llegar, llegar con todos los amigos y `scoreGoal` (de 1,700 en el nivel 1 a 4,000 en el 10). Una prueba comprueba que manejar con cuidado no alcanza la meta de puntos: hay que hacer trucos. Tarjetas con sus tres estrellas y el récord, total en la lista de niveles y en Modos, y en los resultados las tres metas con las nuevas marcadas.
- **Retos nuevos:** 10, 20 y 30 estrellas, y terminar los 10 niveles (16 retos en total).

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

**Hecho en la fase 6 (2026-10-19):**

- **PWA:** `vite-plugin-pwa` en `vite.config.ts` con el manifiesto (Cerro Arriba, `es-MX`, pantalla completa, horizontal, íconos de 192 y 512 y uno *maskable*) y un service worker que guarda todo el juego. Las fuentes de Google Fonts se guardan en caché tras la primera visita, así que el juego abre sin internet desde la segunda vez. Comprobado: con el servidor apagado, la página carga completa, fuentes incluidas.
- **Íconos:** dibujados con el mismo código del juego (el ajolote sobre el cerro), en `public/icons/`: 192, 512, *maskable* 512, ícono de iPhone 180 y favicon 32.
- **Instalar:** botón "Instalar" en el inicio cuando Chrome lo permite (Android y computadora); en iPhone, una línea con los dos toques (Compartir y luego Agregar a pantalla de inicio). Nada de esto aparece si el juego ya está instalado.
- **Rutas relativas** (`base: './'`): el mismo build funciona en la raíz de un dominio o en una subcarpeta.
- **Publicación:** `.github/workflows/deploy.yml` prueba y compila en cada push a `main` y publica en GitHub Pages. Mientras el repositorio sea privado, el paso de publicar se salta. Para activarlo, Emir hace público el repositorio y en Settings > Pages elige "GitHub Actions"; el enlace queda como `https://shinyemir.github.io/cabra-rally/`. Si prefiere dejarlo privado: Cloudflare Pages o Netlify con comando `npm run build` y carpeta `dist`.
- **Fase 6 cerrada el 2026-10-19.** El juego está en línea en `https://shinyemir.github.io/cabra-rally/`; Emir lo instaló en su teléfono y funciona. Cada push a `main` corre pruebas y build y solo publica si todo pasa; si algo falla, el sitio se queda con la última versión buena.
- **Lighthouse 13.5** (versión de producción, simulación de teléfono): rendimiento 98 a 99, accesibilidad 100, buenas prácticas 100, SEO 100. Lighthouse 12 y posteriores ya no tienen la categoría "PWA"; la instalabilidad se comprobó a mano (manifiesto válido, íconos, service worker activo que controla la página). Para pasar de 87 a 98 se cargaron las fuentes sin bloquear el primer dibujado y se agregó `robots.txt`.

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
| Nombre definitivo del juego | **Decidido el 2026-10-18: Cerro Arriba.** Falta revisar que no exista en las tiendas ni en el registro de marcas antes de publicar. Las claves internas de guardado siguen como `cabra-rally-*` para no borrar el progreso | Fase 5 |
| Conductor por defecto | Ajolote (hecho en la fase 5) | Fase 5 |
| Idiomas | Solo español de México al inicio. Dejar los textos en un solo archivo para traducir después | Fase 6 |
| Orientación | Solo horizontal | Fase 2 |
| Número de niveles de historia | 5 al lanzar; 10 desde la fase 8 | Fase 4 |
| Monedas | Se cuentan y se guardan (hecho en la fase 5, clave `cabra-rally-coins`), sin tienda todavía. Todos los conductores están disponibles desde el inicio | Fase 5 |
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
