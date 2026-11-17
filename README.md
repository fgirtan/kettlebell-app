# Kettlebell App

Progressive Web App (PWA) pentru antrenamente cu kettlebell: funcționează offline, se instalează pe ecranul telefonului și nu are nevoie de server sau cont.

## Ce face

- **Generează antrenamente în funcție de timp** (5–90 min), nivel (începător / intermediar / avansat) și accent (tot corpul, picioare, partea superioară, core).
- **Animație pentru fiecare exercițiu**: figură animată, văzută din profil, cu kettlebell-ul.
- **94 de exerciții**: 72 principale (swing, clean, snatch, genuflexiuni, îndreptări, fandări, prese, ramat, brațe, core, ridicarea turcească, cărat), plus 11 de încălzire și 11 de stretching. Fiecare are indicații de execuție în română și greșeala de evitat.
- **Ordinea are logică de antrenament**: fiecare circuit acoperă tiparele de bază (hinge, genuflexiune, împins, tras, fandare, core, tot corpul), apoi ordinea e optimizată astfel încât:
  - exercițiile explozive și tehnice (swing, clean, snatch, get-up) vin primele, cât ești odihnit;
  - partea inferioară alternează cu cea superioară, deci aceeași grupă musculară nu lucrează de două ori la rând;
  - core-ul și exercițiile la sol sunt grupate la final, ca să nu te tot ridici și să te tot pui jos.
- **Încălzirea și revenirea** se scalează după durată. Încălzirea merge de la cardio ușor la umeri, șolduri, picioare, apoi activare; stretchingul trece de la exerciții în picioare la cele la sol.
- **Player cu cronometru**: bip în ultimele 3 secunde, anunț vocal în română, vibrații, „schimbă partea” la exercițiile unilaterale, ecranul rămâne aprins (Wake Lock).
- **Exerciții interschimbabile**: înlocuiești orice exercițiu cu altul din aceeași categorie, iar ordinea se recalculează.
- **Istoric** cu numărul de antrenamente, minutele totale și zilele la rând (salvat local, pe telefon).

## Instalare pe telefon

Aplicația are nevoie de HTTPS ca să poată fi instalată. Cel mai simplu e GitHub Pages:

1. În repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
2. După ~1 minut, deschide `https://<user>.github.io/<repo>/` pe telefon.
3. **Android (Chrome):** ⋮ → *Instalează aplicația* / *Adaugă pe ecranul de pornire*.
   **iPhone (Safari):** Partajare → *Adaugă pe ecranul principal*.

După prima deschidere, totul e salvat în cache și merge **fără internet**.

## Rulare locală

```bash
python3 -m http.server 8000
```

Apoi deschide http://localhost:8000.

## Structură

| Fișier | Rol |
| --- | --- |
| `js/exercises.js` | Baza de date de exerciții (categorie, regiune, mușchi, nivel, indicații) |
| `js/generator.js` | Bugetul de timp, alegerea exercițiilor, optimizarea ordinii, timeline-ul de intervale |
| `js/figure.js` | Motorul de animație: figură SVG cu cinematică directă și inversă |
| `js/anims.js` | Cadrele cheie ale animației pentru fiecare tipar de mișcare |
| `js/app.js` | Interfața: generator, player, bibliotecă, istoric, setări |
| `sw.js` | Service worker pentru funcționare offline (crește `VERSION` după orice modificare) |
| `dev/` | Unelte de dezvoltare: grila de animații, test pentru generator, generarea iconițelor |

Fără dependențe și fără pas de build: doar HTML, CSS și JavaScript.
