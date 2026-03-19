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

### Parametri FTP usati dal workflow

- `server`: `ftp.umbertocicero.com`
- `protocol`: `ftps`
- `port`: `21`
- `server-dir`: `/public_html/`

Se il tuo hosting non supporta FTPS, cambia `protocol: ftps` in `protocol: ftp`.
