# Knee model from an MRI

An interactive, self-contained model of a left knee, driven by an MRI report. It shows what the kneecap, cartilage and tendons do during walking, running, cycling, home exercises and gym lifts, and lays out a 6-week marathon plan.

**Live page:** https://saadsaifse.github.io/knee-model-mri/ (dark theme: [knee-model.html](https://saadsaifse.github.io/knee-model-mri/knee-model.html))

> Educational model, not medical advice. The drawings are schematic, not traced from the scan, and the numbers come from published averages (Huberti & Hayes contact areas, a pulley model of the kneecap, a lateral shift calibrated to the MRI). Talk to your physio or doctor before acting on it.

## MRI findings modelled

- Mild lateral patellar subluxation (0.8 cm), TT-TG 1.7 cm
- Trace chondromalacia with a tiny full-thickness cartilage defect and subchondral edema on the lateral patellar facet
- Mild quadriceps and patellar tendinosis
- Medial meniscus extrusion without a tear, and a subcentimetre Baker's cyst

## Screenshots

**Fig 1: patella tracking bench.** The kneecap rides in its groove as the knee bends. A gauge reads the outward shift and the stress on the outer facet.

![Patella tracking bench](docs/screenshots/fig1-bench-light.png)

**Fig 2: one running stride.** A treadmill runner, with the knee shown from the side, from the front and in a cross-section slice. Every view moves with the stride.

![Running stride with anatomy](docs/screenshots/fig2-running-light.png)

**Fig 3: cycling saddle height**, and **Fig 12: single-leg hip thrust** (one of 13 figures)

<p><img src="docs/screenshots/fig3-cycling-light.png" width="49%" alt="Cycling"> <img src="docs/screenshots/fig12-hip-thrust-light.png" width="49%" alt="Single-leg hip thrust"></p>

Every figure has hover, a slider and play/pause.

## Files

`index.html` is the page: `knee-model-light.html`, served on GitHub Pages. `knee-model.html` is the dark theme. Every html file is standalone, so you can open it straight in a browser.

Earlier drafts are kept for reference: `knee.html` (walking, running, home exercises), `knee-v2.html` (adds cycling, gym, cartilage and the marathon) and `knee-v3.html` (adds the anatomy views and the running stride), each with a `-light` twin.

## Rebuilding

You need Node 18+ and no packages.

```sh
node build-v3.mjs --page          # knee-model.html
node build-v3.mjs --page --light  # knee-model-light.html and index.html
```

- `model.mjs` holds the biomechanics: quad force, the force between the kneecap and the femur, contact area, lateral shift and facet stress. Every number shown on the pages comes from it.
- `bench.mjs`, `mannequin.mjs`, `gym.mjs`, `exercises.mjs` and `anatomy-knee.mjs` hold the geometry and figures.
- `page/` holds the prose. `v2/` and `v3/` hold the prose for the earlier drafts, built without `--page`.
- `vendor/anatomy/` is the isometric drawing kit (MIT, see its LICENSE).
