# Hellworld

RPG de acción de mundo abierto que se juega en el navegador, en PC y en celular.
Exploras un reino de bosque oscuro y ruinas poseído por un demonio, te vuelves más
poderoso con las **Almas** y derrotas a **Belcebú**, el demonio del reino.

**Versión actual: 0.14** (el primer reino se está ampliando, rumbo a la 0.2)


> Es un juego en desarrollo y **exigente**: empiezas con poca vida y tienes que mejorar
> en el altar para poder llegar a Belcebú. Tu progreso se guarda solo en el navegador.

## Controles

| Acción | PC | Celular |
|---|---|---|
| Moverse | W A S D (o flechas) | Joystick (mitad izquierda de la pantalla) |
| Atacar | Clic izquierdo | Botón Golpe |
| Rodar (esquive) | Espacio | Botón Rodar |
| Llama | Clic derecho | Botón Llama |
| Nova | Q | Botón Nova |
| Escudo | E | Botón Escudo |
| Usar altar / hablar | F | Botón Usar |
| Mapa grande | N (o Esc para cerrarlo) | Tocar el minimapa |
| Silenciar | M (o el botón del altar) | Botón del altar |

En el celular se juega mejor en horizontal y el personaje apunta solo al demonio más
cercano. El zoom del navegador está desactivado a propósito.

## Cómo se juega

- **Rodar** te hace invulnerable un instante: úsalo para esquivar los ataques, que siempre
  avisan antes de golpear (un círculo o una franja de color en el suelo).
- **Almas:** los demonios las sueltan al morir y sirven para mejorar en el altar. Si
  mueres, las pierdes en el lugar donde caíste: vuelve por ellas. Si mueres otra vez con
  almas encima antes de recogerlas, esas se pierden para siempre.
- **Altar** (donde empiezas): descansas (vida y maná al máximo, los demonios regresan),
  mejoras tus estadísticas y puedes activar o quitar el sonido o empezar una partida nueva.
- **Minimapa** (abajo a la izquierda): muestra todo el mapa desde el inicio. Marca el altar,
  al Peregrino y la reliquia de la misión activa.

## Tu personaje

Empiezas con **30 de vida, 50 de maná y 5 de daño en el golpe**. En el altar mejoras:

| Estadística | Qué sube por nivel |
|---|---|
| **Vigor** | +10 de vida máxima |
| **Fuerza** | +2 de daño del golpe |
| **Magia** | +5 de maná máximo y +15 % de poder de hechizos |

El *poder de hechizos* multiplica el daño de la Llama y la Nova (100 % es el daño base).
La primera mejora de cada estadística cuesta 20 almas, la segunda 35, la tercera 50, y así.

## Hechizos

| Hechizo | Control | Maná | Qué hace |
|---|---|---|---|
| **Llama** | Clic derecho | 15 | Bola de fuego hacia el mouse, 5 de daño. Espera 0.35 s |
| **Nova** | Q | 25 | Onda alrededor tuyo, 25 de daño, empuja a los demonios. Espera 2 s |
| **Escudo** | E | 10 | Absorbe el siguiente golpe (dura 5 s). Espera 6 s |

El maná se recarga solo. Los hechizos no se pueden lanzar mientras ruedas.

## Los demonios

| Demonio | Cómo ataca | Vida | Almas |
|---|---|---|---|
| **Menor** | Golpe cuerpo a cuerpo con aviso | 30 | 2 |
| **Lanzador** (morado) | Dispara esferas de sombra y se mantiene a distancia | 22 | 5 |
| **Veloz** (naranja) | Embiste en línea recta (la franja amarilla avisa) | 14 | 5 |
| **Tanque** (gris) | Golpe en área, lento y muy fuerte; casi no lo empujan | 90 | 10 |
| **Invocador** (verde) | Invoca esbirros (hasta 3 vivos) y se mantiene a distancia | 28 | 20 |
| **Esbirro** (rosado) | Golpe pequeño y rápido | 8 | 0 |

Los campamentos cercanos al altar son de demonios menores; los lejanos mezclan tipos.

## Belcebú

El demonio del primer reino vive en el **castillo del noreste**: muros de piedra con una
puerta al sur. Solo despierta cuando entras y se reinicia si sales. Tiene tres ataques que
avisan antes de golpear (golpe en el suelo, embestida y esferas de sombra) y casi no
descansa entre uno y otro. Su vida aparece en una barra vertical en el borde derecho de la
pantalla. Cuando cae, suelta muchas almas y no vuelve.

## Misión secundaria

**La reliquia perdida:** habla con el Peregrino, junto al altar. Te pedirá una reliquia
escondida en las Ruinas del Norte. Tráesela para recibir almas.

## Hoja de ruta

| Versión | Contenido |
|---|---|
| 0.11 a 0.14 | Pixel art, mapa de 6400×6400, minimapa y demonios nuevos ✔ |
| 0.15 | Ambiente y supervivencia: brasas repartidas por el mapa, forma de curarse y partículas |
| 0.16 | Guardián de fuerza y pistas para encontrarlo |
| 0.17 | Guardián de magia y puerta del castillo que abren las 2 llaves |
| 0.18 | Misiones secundarias 1 a 3 |
| 0.19 | Misiones 4 a 6, mejoras escondidas de vida y maná, pulido y celular |
| 0.2 | Segundo reino y transformación en demonio |
| 0.3 y 0.4 | Tercer y cuarto reino |
| 0.5 | Fusión de los 4 reinos y súper jefe final |
| 0.6 a 1.0 | Pulido y todo lo necesario para publicarlo |

## Ayúdanos a probar

Si algo falla o se siente raro, cuéntanos:

- Qué dispositivo y navegador usas (por ejemplo: celular Android con Chrome).
- Qué estabas haciendo y qué pasó.
- Si el juego se queda en negro o se traba, abre la consola con **F12 → Console** (en PC) y
  copia el mensaje en rojo.

Para dificultad y balance, lo más útil es saber **dónde moriste** y qué te pareció muy fácil
o muy difícil.

## Correr en local

El juego usa módulos de JavaScript, así que no abre con doble clic en `index.html`.
Usa un servidor local, por ejemplo la extensión **Live Server** de VS Code.

## Estructura

```
index.html
CSS/style.css
assets/sprites/        hojas de sprites en pixel art (PNG)
tools/                 generador de sprites (Python + Pillow) y vistas previas
JS/
  main.js            bucle principal y estados del juego
  core/              input (teclado, mouse y táctil), cámara, audio y sprites
  entities/          jugador, demonios, jefe, altar, almas, Peregrino, reliquia
  systems/           mundo y mapa, minimapa, hechizos, HUD, altar, diálogo, misión,
                     guardado y controles táctiles
```

(Si tus carpetas se llaman `css` y `js` en minúscula, usa esos nombres: lo importante es
que coincidan con las rutas de `index.html`.)

## Tecnología

JavaScript puro y Canvas 2D, sin librerías. El arte es pixel art 16x16 ampliado x2,
generado con código (`tools/generate_sprites.py`, necesita `pip install pillow`).
El sonido se sintetiza con Web Audio, sin archivos de audio.

## Modo de pruebas (para desarrollo)

Abre el juego con `?debug` al final de la dirección (por ejemplo `http://127.0.0.1:5500/?debug`)
y en la consola del navegador (F12) tendrás `hellworld` para moverte por el mapa sin caminar:

```js
hellworld.teleport(5312, 1400)   // a la puerta del castillo de Belcebú
hellworld.teleport(1120, 3296)   // a la reliquia, en las Ruinas del Norte
hellworld.layout                 // todas las posiciones importantes del mapa
```