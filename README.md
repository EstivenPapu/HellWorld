# Hellworld

RPG de acción de mundo abierto que se juega en el navegador, en PC y en celular.
Exploras un reino poseído por un demonio, te vuelves más poderoso con las **Almas**
y descubres hechizos para derrotarlo.

**Versión actual: 0.11 (en camino a la 0.2; el primer reino se está ampliando)**

🎮 **Jugar:** https://TU-USUARIO.github.io/TU-REPOSITORIO/

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
| Silenciar | M (o el botón del altar) | Botón del altar |

En el celular se juega mejor en horizontal. El personaje apunta solo al demonio más cercano.

## Qué incluye la 0.1

- Primer reino: mapa grande con cámara que sigue al jugador.
- 5 demonios menores y el jefe del reino, con ataques que avisan antes de golpear.
- Combate cuerpo a cuerpo, esquive y 3 hechizos (Llama, Nova y Escudo) con barra de maná.
- Almas: se pierden al morir y se recuperan donde caíste.
- Altar para descansar y mejorar Vigor, Fuerza y Magia.
- Misión secundaria "La reliquia perdida".
- Guardado automático en el navegador.
- Efectos de sonido y música generados con código.

## Hoja de ruta

| Versión | Contenido |
|---|---|
| 0.1 | Primer reino |
| 0.2 | Segundo reino y transformación en demonio |
| 0.3 | Tercer reino |
| 0.4 | Cuarto reino |
| 0.5 | Fusión de los 4 reinos y súper jefe final |
| 0.6 a 1.0 | Pulido y todo lo necesario para publicarlo |

## Correr en local

El juego usa módulos de JavaScript, así que no abre con doble clic en `index.html`.
Usa un servidor local, por ejemplo la extensión **Live Server** de VS Code.

## Estructura

```
index.html
css/style.css
assets/sprites/        hojas de sprites en pixel art (PNG)
tools/                 generador de sprites (Python + Pillow)
js/
  main.js            bucle principal y estados del juego
  core/              input (teclado, mouse y táctil), cámara y audio
  entities/          jugador, demonios, jefe, altar, almas, Peregrino, reliquia
  systems/           mundo, hechizos, HUD, altar, diálogo, misión, guardado y controles táctiles
```

## Tecnología

JavaScript puro y Canvas 2D, sin librerías. El arte es pixel art 16x16 ampliado x2,
generado con código (`tools/generate_sprites.py`, necesita `pip install pillow`).
El sonido se sintetiza con Web Audio, sin archivos de audio.