# Umberto's Curriculum Vitae site - [link](http://umbertocicero.com)

This is my Curriculum Vitae site.

# to run it

npm install -g serve
serve .

or using pyton
python3 -m http.server 8000

# ispiration
<https://lusion.co/>

Deploy in Prod
creare un pacchetto .zip con tutti i file, caricarlo e decomprimerlo in:
<https://hostingweb82.netsons.net:2083/cpsess5949976435/frontend/jupiter/index.html?login=1&post_login=77750120357668>

## Deploy automatico con GitHub Actions + Netsons FTP

Questa repo include:

- `.github/workflows/deploy-netsons-ftp.yml`: deploy su push di tag `v*`.

### Trigger

Il workflow parte al push di un tag versione (`git tag v1.0.0 && git push origin v1.0.0`) e deploya solo se il commit del tag appartiene al branch di default del repository (es. `main` o `master`).

### Secrets da configurare in GitHub (`Settings -> Secrets and variables -> Actions`)

- `FTP_USER`: utente FTP Netsons.
- `FTP_PASS`: password FTP Netsons.

Se li salvi come **Environment secrets**, il job deve puntare allo stesso environment (`umbertocicero_site`).

### Parametri FTP usati dal workflow

- `server`: da variabile `FTP_SERVER` (default `ftp.umbertocicero.com`)
- `protocol`: da variabile `FTP_PROTOCOL` (default `ftp`, valori ammessi: `ftp` o `ftps`)
- `port`: da variabile `FTP_PORT` (default `21`)
- `server-dir`: `/public_html/`

### Variabili opzionali (Repository Variables)

- `FTP_SERVER`
- `FTP_PROTOCOL`
- `FTP_PORT`

### Errore `530 Login authentication failed`

Di solito indica:

- utente FTP non corretto (su alcuni hosting va usato username completo, es. `utente@dominio`);
- password FTP errata;
- protocollo errato (`ftp` vs `ftps`) rispetto a quello abilitato sul piano hosting.
