export const modernTemplate = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; }
  .card { width: 148mm; min-height: 210mm; position: relative; }

  .band { background: {{haendler.farbe}}; color: #fff; padding: 10mm 14mm 8mm; }
  .band .logo img { max-height: 12mm; max-width: 46mm; object-fit: contain; filter: brightness(0) invert(1); margin-bottom: 4mm; }
  .band .haendler-name { font-size: 10pt; font-weight: 700; margin: 0; opacity: 0.95; }

  .body-area { padding: 10mm 14mm; }
  .titel { font-size: 22pt; font-weight: 800; margin: 0 0 1mm; letter-spacing: -0.3pt; }
  .variante { font-size: 10pt; color: #6b6b6b; margin: 0 0 2mm; }
  .baujahr { font-size: 9pt; color: #9a9a9a; margin: 0 0 6mm; }

  .content-zone { font-size: 10pt; line-height: 1.6; margin-bottom: 8mm; }
  .content-zone ul { padding-left: 0; list-style: none; margin: 0 0 6mm; }
  .content-zone li { margin: 0 0 2mm; }
  .content-zone p { margin: 0 0 4mm; }

  .preis-row { display: flex; justify-content: flex-end; }
  .preis-badge { display: inline-block; border: 3pt solid {{haendler.farbe}}; color: {{haendler.farbe}}; font-size: 22pt; font-weight: 800; padding: 4mm 8mm; border-radius: 4mm; }

  .footer { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; font-size: 7pt; color: #b0b0b0; }
</style>
</head>
<body>
  <div class="card">
    <div class="band">
      <div class="logo">{{#if haendler.logo}}<img src="{{haendler.logo}}" alt="Logo">{{/if}}</div>
      <p class="haendler-name">{{haendler.name}}{{#if haendler.telefon}} · {{haendler.telefon}}{{/if}}</p>
    </div>

    <div class="body-area">
      <div class="titel">{{fahrzeug.marke}} {{fahrzeug.modell}}</div>
      {{#if fahrzeug.variante}}<p class="variante">{{fahrzeug.variante}}</p>{{/if}}
      <p class="baujahr">Baujahr {{fahrzeug.baujahr}} · {{fahrzeug.km}}{{#if fahrzeug.getriebe}} · {{fahrzeug.getriebe}}{{/if}}</p>

      <div class="content-zone">__PRICETAG_CONTENT__</div>

      <div class="preis-row">
        <div class="preis-badge">{{fahrzeug.preis}}</div>
      </div>
    </div>

    <div class="footer">{{haendler.name}}{{#if haendler.adresse}} · {{haendler.adresse}}{{/if}}</div>
  </div>
</body>
</html>
`
