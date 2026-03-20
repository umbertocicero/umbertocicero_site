# Umberto's Curriculum Vitae site - [link](http://umbertocicero.com)

This is my Curriculum Vitae site.

## Setup corretto (da non dimenticare)

Per una corretta installazione e deploy del progetto:

1. Installa le dipendenze Node con `npm install`.
2. Esegui `gulp` per generare/aggiornare gli asset frontend.
3. Solo dopo fai deploy (manuale o automatico).

Se salti `npm install` o `gulp`, rischi di pubblicare file vecchi/non allineati.

## Come funziona Gulp in questo progetto

`gulp` legge `gulpfile.js` e automatizza la pipeline frontend.

Task principali:

- `npx gulp vendor`: copia librerie da `node_modules` a `vendor` (Bootstrap, jQuery, simple-line-icons, ecc.).
- `npx gulp css`: compila SCSS (`scss/`) in CSS (`css/`) e crea anche i file minificati.
- `npx gulp js`: minifica i file JavaScript in `js/*.min.js`.
- `npx gulp build` (default): esegue `css`, `js` e `vendor`.
- `npx gulp dev`: esegue build completa, avvia BrowserSync e watch dei file.

Ordine mentale da ricordare sempre:

1. `npm install`
2. `npx gulp build`
3. verifica locale
4. deploy

## Avvio locale rapido

```bash
npm install
npx gulp build
npm install -g serve
serve .
```

In alternativa:

```bash
python3 -m http.server 8000
```

## Deploy in produzione

### Deploy manuale (zip)

Creare un pacchetto `.zip` con tutti i file, caricarlo e decomprimerlo in:
<https://hostingweb82.netsons.net:2083/cpsess5949976435/frontend/jupiter/index.html?login=1&post_login=77750120357668>

### Deploy automatico con GitHub Actions + Netsons FTP

Questa repo include:

- `.github/workflows/deploy-netsons-ftp.yml`: deploy su push di tag `v*`.

Trigger:

- il workflow parte al push di un tag versione (`git tag v1.0.0 && git push origin v1.0.0`);
- deploya solo se il commit del tag appartiene al branch di default del repository (es. `main` o `master`).

Secrets da configurare in GitHub (`Settings -> Secrets and variables -> Actions`):

- `FTP_USER`: utente FTP Netsons;
- `FTP_PASS`: password FTP Netsons.

Se li salvi come **Environment secrets**, il job deve puntare allo stesso environment (`umbertocicero_site`).

Parametri FTP usati dal workflow:

- `server`: da variabile `FTP_SERVER` (default `ftp.umbertocicero.com`);
- `protocol`: da variabile `FTP_PROTOCOL` (default `ftp`, valori ammessi: `ftp` o `ftps`);
- `port`: da variabile `FTP_PORT` (default `21`);
- `server-dir`: `/public_html/`.

Variabili opzionali (Repository Variables):

- `FTP_SERVER`
- `FTP_PROTOCOL`
- `FTP_PORT`

Errore `530 Login authentication failed`:

- utente FTP non corretto (su alcuni hosting va usato username completo, es. `utente@dominio`);
- password FTP errata;
- protocollo errato (`ftp` vs `ftps`) rispetto a quello abilitato sul piano hosting.

## Ispirazione

<https://lusion.co/>
