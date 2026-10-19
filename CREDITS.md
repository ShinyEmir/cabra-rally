# Créditos

Recursos usados en Cerro Arriba, con su origen y licencia.

## Propios

- **Código:** escrito para este proyecto.
- **Arte:** todo se dibuja con código en Canvas 2D (animales, carro, fondos, estadio, monedas y partículas). No hay imágenes externas.
- **Sonido:** todos los efectos se generan con Web Audio en `src/audio/sfx.ts`. No hay archivos de audio. Todavía no hay música.

## Fuentes

| Recurso | Autor | Licencia | Origen | Uso |
| --- | --- | --- | --- | --- |
| Lilita One | Juan Montoreano | SIL Open Font License 1.1 | Google Fonts (fonts.google.com/specimen/Lilita+One) | Títulos, puntaje y botones |
| Nunito | Vernon Adams, Cyreal, Jacques Le Bailly | SIL Open Font License 1.1 | Google Fonts (fonts.google.com/specimen/Nunito) | Textos del menú y etiquetas |

Se cargan desde Google Fonts y el service worker guarda una copia tras la primera visita, para que el juego abra sin internet. La licencia también permite servirlas desde el propio sitio si algún día se prefiere.

## Íconos de la app

Dibujados con el código del propio juego (el ajolote sobre el cerro) y guardados en `public/icons/`.
