# 🌍 GeoDominium — Global Strategic Warfare

> **Un gioco di strategia geopolitica a turni, interamente in JavaScript puro, con dati reali.**

Controlla una delle 50 nazioni giocabili su una mappa mondiale SVG interattiva.
Gestisci 10 risorse reali, comanda 12 tipi di unità militari, ricerca 12 tecnologie, intessi alleanze e sanzioni, conquista territori e combatti un'IA strategica che si adatta al tuo stile di gioco.

<p align="center"><strong>🎮 Apri <code>index.html</code> — nessuna installazione, nessun build step.</strong></p>

---

## 📖 Sommario

- [Come Giocare](#-come-giocare)
- [Il Mondo di Gioco](#-il-mondo-di-gioco)
- [Sistema Economico](#-sistema-economico)
- [Sistema Militare e Combattimento](#️-sistema-militare-e-combattimento)
- [Sistema di Guarnigione](#-sistema-di-guarnigione)
- [Sistema di Malcontento (Unrest)](#-sistema-di-malcontento-unrest)
- [Diplomazia](#-diplomazia)
- [Spionaggio](#-spionaggio)
- [Escalation Nucleare](#️-escalation-nucleare)
- [Condizioni di Vittoria](#-condizioni-di-vittoria)
- [Intelligenza Artificiale](#-intelligenza-artificiale)
- [Eventi Casuali](#-eventi-casuali)
- [Sistema di Raggiungibilità](#-sistema-di-raggiungibilità)
- [Assedio della Patria (Homeland Siege)](#️-assedio-della-patria-homeland-siege)
- [Negoziazione di Pace](#️-negoziazione-di-pace)
- [Internazionalizzazione (i18n)](#-internazionalizzazione-i18n)
- [Struttura Tecnica](#️-struttura-tecnica)
- [Feature Completa](#-feature-completa)

---

## 🎮 Come Giocare

1. **Apri `index.html`** in un browser moderno (Chrome, Firefox, Edge)
2. **Scegli la lingua** 🇮🇹 Italiano o 🇬🇧 English
3. **Seleziona la tua nazione** tra 50 nazioni reali con risorse, eserciti e profili unici
4. **Ogni turno**:
   - Raccogli risorse automaticamente dai tuoi territori
   - Produci nuove unità militari
   - Ricerca tecnologie
   - Attacca territori nemici
   - Gestisci la diplomazia (alleanze, sanzioni, embargo, tributi)
   - Seda le rivolte nelle colonie
   - Premi **Fine Turno** → l'IA gioca per tutte le altre nazioni
5. **Vinci** con una delle 3 condizioni di vittoria

---

## 🌍 Il Mondo di Gioco

### 50 Nazioni Giocabili

Ogni nazione ha **dati reali geopolitici**: risorse iniziali, produzione per turno, esercito, vicini di confine, power rating e profilo IA.

| Profilo | Nazioni esempio | Comportamento |
|---|---|---|
| 🦅 **Superpower** | 🇺🇸 USA, 🇷🇺 Russia, 🇨🇳 Cina | Alta aggressione, forte tech, tolleranza nucleare |
| 🏛️ **Regional** | 🇮🇳 India, 🇫🇷 Francia, 🇹🇷 Turchia, 🇸🇦 Arabia S. | Espansione regionale, diplomazia media |
| 🛡️ **Defensive** | 🇬🇧 UK, 🇩🇪 Germania, 🇯🇵 Giappone, 🇮🇱 Israele | Bassa aggressione, alta difesa e tech |
| 🎯 **Opportunist** | 🇪🇬 Egitto, 🇵🇱 Polonia, 🇵🇰 Pakistan, 🇮🇩 Indonesia | Colpisce quando vede debolezza |
| 🕊️ **Neutral** | 🇦🇺 Australia, 🇳🇴 Norvegia, 🇸🇪 Svezia, 🇳🇿 N. Zelanda | Raramente attacca, alta diplomazia |
| 💣 **Unstable** | 🇰🇵 Corea del Nord, 🇻🇪 Venezuela, 🇲🇲 Myanmar | Imprevedibile, alta tolleranza nucleare |

### ~180 Nazioni Minori

Tutti gli altri territori del mondo (da 🇦🇩 Andorra a 🇿🇼 Zimbabwe) sono nazioni minori con risorse generate proceduralmente e eserciti deboli. Possono essere conquistati, possono rivoltarsi, e controllano asset strategici chiave.

### 10 Risorse

| Risorsa | Icona | Uso principale |
|---|:---:|---|
| **Fondi** | 💰 | Costruzione unità, ricerca, diplomazia |
| **Petrolio** | 🛢️ | - |
| **Gas** | 🔥 | - |
| **Terre Rare** | ⚗️ | Droni, tecnologia avanzata |
| **Oro** | 🥇 | Caccia, bombardieri, missili balistici |
| **Argento** | 🥈 | Sottomarini, missili, droni |
| **Diamanti** | 💎 | Testate nucleari |
| **Uranio** | ☢️ | Programma nucleare, missili balistici |
| **Acciaio** | 🔩 | Corazzati, navi, artiglieria |
| **Cibo** | 🌾 | - |

### 16 Asset Strategici

Chokepoint marittimi, rotte commerciali, basi militari e zone di risorse contese. Il controllo di un asset dà **bonus risorse ogni turno**.

| Asset | Tipo | Bonus | Controllato da |
|---|---|---|---|
| ⚓ Stretto di Hormuz | Chokepoint | 🛢️+30 | 🇮🇷🇴🇲 |
| 🚢 Canale di Panama | Canale | 💰+50 | 🇵🇦 |
| 🚢 Canale di Suez | Canale | 💰+40, 🛢️+10 | 🇪🇬 |
| ⚓ Stretto di Malacca | Chokepoint | 💰+35 | 🇲🇾🇮🇩 |
| ⚓ Stretto di Singapore | Chokepoint | 💰+30 | 🇸🇬 |
| ⚓ Bosforo | Chokepoint | 💰+20 | 🇹🇷 |
| ⚓ Stretto di Gibilterra | Chokepoint | 💰+15 | 🇪🇸🇬🇧 |
| ⚓ Bab el-Mandeb | Chokepoint | 💰+20, 🛢️+5 | 🇩🇯🇾🇪 |
| ⚓ Canale della Manica | Chokepoint | 💰+20 | 🇬🇧🇫🇷 |
| ⚓ Stretti Danesi | Chokepoint | 💰+15 | 🇩🇰 |
| ⚓ Canale del Mozambico | Rotta | 💰+10, 🛢️+5 | 🇲🇿🇲🇬 |
| ⚓ Stretto di Taiwan | Chokepoint | ⚗️+10 | 🇹🇼 |
| ❄️ Rotta Artica | Rotta | 💰+20, 🔥+10 | 🇳🇴🇷🇺🇨🇦 |
| ⚓ Capo di Buona Speranza | Rotta | 💰+15 | 🇿🇦 |
| 🛢️ Mar Cinese Meridionale | Risorse contese | 🛢️+15, 🔥+10 | 🇵🇭🇻🇳 |
| 🏴 Base di Gibuti | Base militare | 💰+15 | 🇩🇯 |

---

## 💰 Sistema Economico

### Produzione per Turno

Ogni territorio produce risorse basate sui dati reali della nazione:

- **Territori propri** (homeland + originali): **100%** della produzione
- **Territori conquistati** (colonie): **70%** della produzione (penalità di occupazione)
- **Sanzioni economiche**: −5% per ogni nazione che ti sanziona (cumulativo)
- **Bonus tecnologici**:
  - `Energia Verde` → +20 💰/turno (distribuiti su tutti i territori)
  - `Miniere Profonde` → +30% risorse estrattive (petrolio, gas, oro, argento, diamanti, uranio, terre rare)
- **Bonus asset strategici**: somma dei bonus di ogni asset controllato

### Relazione Decadenza

- Le relazioni **positive** decadono di −3 ogni 5 turni (previene stallo di pace permanente)
- Le relazioni **negative** recuperano +2 ogni 5 turni (solo se non in guerra)

### Stabilità Globale

Un valore 0-100% che rappresenta lo stato del mondo:

- Ogni turno: guerre attive trascinano la stabilità verso il basso (fino a −8%/turno)
- Assenza di guerre: lenta risalita (+3%/turno se pace totale, +0.5% altrimenti)
- **Ogni attacco nucleare**: −25% istantaneo

---

## ⚔️ Sistema Militare e Combattimento

### 12 Tipi di Unità

| Unità | Icona | ATK | DEF | Costo | Portata | Note |
|---|:---:|:---:|:---:|---|:---:|---|
| Fanteria | 🪖 | 3 | 4 | 💰50 | 1 | Base, economica |
| Corazzati | 🚜 | 8 | 6 | 💰180 🔩10 | 1 | Buon rapporto ATK/DEF |
| Artiglieria | 💥 | 10 | 2 | 💰200 🔩10 | 2 | Alto ATK, fragile |
| Caccia | ✈️ | 12 | 5 | 💰350 🔩20 🥇3 | 4 | Versatile, veloce |
| Bombardiere | 🛩️ | 18 | 3 | 💰600 🔩30 🥇5 | 5 | Devastante ma costoso |
| Drone | 🤖 | 7 | 1 | 💰120 ⚗️3 🥈2 | 3 | Economico, usa terre rare |
| Flotta Navale | 🚢 | 14 | 10 | 💰500 🔩35 🥇3 | 3 | Necessaria per attacchi via mare |
| Sottomarino | 🐟 | 16 | 8 | 💰450 🔩30 🥈3 | 4 | Forte ATK, stealthy |
| Missile Crociera | 🚀 | 25 | 0 | 💰300 🔩15 🥈2 | 6 | Consumabile, lunga gittata |
| Missile Balistico | ☄️ | 40 | 0 | 💰800 🔩20 ☢️2 🥇3 | 10 | Consumabile, gittata enorme |
| Sistema SAM | 📡 | 5 | 20 | 💰250 🔩15 | 3 | Difesa anti-aerea/missile |
| Testata Nucleare | ☢️ | 200 | 0 | 💰5000 ☢️50 💎10 | 15 | L'arma definitiva |

> Le unità **consumabili** (missili, nuke) vengono distrutte dopo l'uso.

### Formula di Combattimento

```
Potenza_ATK = Σ (base_atk + tech_bonus) × quantità  per ogni tipo di unità
Potenza_DEF = Σ (base_def + tech_bonus) × quantità  per ogni tipo di unità

DEF_totale = Potenza_DEF
             × 1.20              (bonus terreno fisso)
             × homeland_bonus    (1.0x — 2.0x se si difende la patria)
             × garrison_bonus    (0.90 — 1.25 in base alla guarnigione locale)

ATK_totale = Potenza_ATK
             × (0.7 + random(0.6))    (fattore casuale ±30%)
             × (1 - fatica)            (penalità per attacchi multipli nel turno)

Esito: ATK_totale > DEF_totale → VITTORIA
```

### Bonus Difesa Patria (Homeland Defense)

Difendere la propria capitale è enormemente più difficile da penetrare:

| Power Rating | Bonus Difesa | Esempio |
|:---:|:---:|---|
| ≥ 80 (Superpower) | ×2.0 (+100%) | 🇺🇸 🇷🇺 🇨🇳 |
| ≥ 60 (Major) | ×1.7 (+70%) | 🇬🇧 🇫🇷 🇮🇱 |
| ≥ 40 (Regional) | ×1.45 (+45%) | 🇦🇺 🇵🇱 🇺🇦 |
| ≥ 20 (Minor+) | ×1.2 (+20%) | 🇻🇪 🇱🇾 🇲🇲 |
| < 20 | ×1.0 (nessuno) | Nazioni minori |

### Sistema di Perdite (Casualties)

Entrambe le parti subiscono **sempre** perdite. L'intensità dipende dal rapporto di forza:

| Esito | Vincitore perde | Perdente perde |
|---|:---:|:---:|
| Vittoria dominante | 15-25% | 55-70% |
| Battaglia ravvicinata | 25-40% | 40-55% |
| Sconfitta | 40-70% | 15-40% |

> Solo una **frazione** dell'esercito è impegnata in ogni singola battaglia. Imperi più grandi impegnano meno truppe per scontro.

### Costo e Fatica d'Attacco (Anti-Blitz)

Ogni attacco nello **stesso turno** costa progressivamente di più, impedendo conquiste a catena:

| Attacco # | Costo 💰 | Costo 🪖 | Penalità ATK |
|:---:|:---:|:---:|:---:|
| 1° | 0 | 0 | 0% |
| 2° | 5 | 0 | −5% |
| 3° | 15 | 1 | −12% |
| 4° | 30 | 2 | −20% |
| 5° | 50 | 3 | −30% |
| 6°+ | 75+ | 4+ | −42%+ (max 60%) |

### Bottino di Guerra (Loot)

| Situazione | Risorse | Armamenti |
|---|---|---|
| Conquista normale | Quota proporzionale (80-100%) + bonus produzione (2-3 turni) | ❌ Distrutti |
| Assedio homeland — sopravvissuta | Quota ridotta (70-90%) della fetta della patria | ❌ Distrutti |
| Assedio homeland — collasso totale | 100% di tutte le risorse | ❌ Distrutti |

---

## 🏰 Sistema di Guarnigione

L'esercito è **nazionale**: non assegni truppe manualmente. Le forze vengono **distribuite automaticamente** con un sistema di pesi strategici.

### Distribuzione Truppe

| Tipo di territorio | Peso | Logica |
|---|:---:|---|
| 🏠 **Patria** (homeland) | `2×` | Difesa prioritaria della capitale |
| ⚔️ **Fronte di guerra** (confina con nemico attivo) | `1.5×` | Rinforzo automatico ai confini |
| 🌍 **Tutti gli altri** | `1×` | Distribuzione base |

> **Formula**: `truppe_territorio = esercito_totale × (peso_territorio / somma_pesi)`

### Livelli di Forza e Impatto

| Truppe assegnate | Livello | Bonus Difesa | Effetto su Unrest |
|:---:|---|:---:|:---:|
| ≥ 15 | 🟦 **HEAVY** | +25% | −6 / turno |
| 6 – 14 | 🟨 **MEDIUM** | +12% | −4 / turno |
| 1 – 5 | 🟧 **LIGHT** | +5% | −2 / turno |
| 0 | 🟥 **NONE** | −10% ⚠️ | +5 / turno ⚠️ |

> **Dilemma strategico**: più territori conquisti, più le truppe si diluiscono → guarnigioni deboli → rivolte!

---

## 🔥 Sistema di Malcontento (Unrest)

I territori conquistati accumulano **malcontento** ogni turno. Al **100%** → **rivolta automatica**: il territorio torna alla nazione originale (che "resuscita" se era stata eliminata).

### Accumulo per Turno (fine turno)

| Fattore | Effetto |
|---|:---:|
| Base | +3 |
| Nazione originale ancora viva | +4 |
| Ogni guerra attiva (max 4) | +1 ciascuna |
| Guarnigione Heavy | −6 |
| Guarnigione Medium | −4 |
| Guarnigione Light | −2 |
| Nessuna guarnigione | +5 |

### ⚡ Rivolte Immediate (Mid-Turn)

Dopo **ogni conquista**, il sistema ricalcola le guarnigioni in tempo reale. Se le colonie restano sguarnite (truppe diiluite su troppi fronti), scatta un **picco di malcontento immediato** — potenzialmente causando rivolte **durante il turno stesso**.

| Guarnigione post-conquista | Picco Unrest | Con nazione viva (×1.4) |
|---|:---:|:---:|
| 🟥 NONE (0 truppe) | +12 | +17 |
| 🟧 LIGHT (1-5 truppe) | +6 | +8 |
| 🟨 MEDIUM (6-14 truppe) | +2 | +3 |
| 🟦 HEAVY (≥15 truppe) | 0 | 0 |

> **Effetto strategico**: non puoi fare "blitz" conquistando 10 territori di fila senza conseguenze. Ogni conquista diluisce le guarnigioni, e le colonie più deboli possono rivoltarsi immediatamente.

### Azione: Seda Rivolta

> **Costo**: 💰15 + 🪖2 fanteria → riduce il malcontento di **40 punti**

### Soglie di Pericolo

| Malcontento | Stato | Colore |
|:---:|---|---|
| 0 – 39% | 🟢 Basso | Verde |
| 40 – 59% | 🟡 Medio | Giallo |
| 60 – 79% | 🟠 Alto | Arancione |
| 80 – 100% | 🔴 Critico — rivolta imminente! | Rosso |

---

## 🤝 Diplomazia

### Azioni Diplomatiche

| Azione | Costo | Effetto | Limiti |
|---|---|---|---|
| **🤝 Proponi Alleanza** | ⚗️10 💰30 | Alleanza reciproca, relazione +30, auto-rimuove sanzioni | La controparte deve accettare |
| **📝 Patto di Non-Aggressione** | ⚗️5 💰15 | Relazione +15 | La controparte deve accettare |
| **⚔️ Dichiara Guerra** | — | Apre conflitto, relazione −60 reciproca | — |
| **🚫 Imponi Sanzioni** | — | −5% produzione al bersaglio, relazione −15 | Una volta per nazione (permanente) |
| **🚫 Embargo Commerciale** | 💰10 | Blocco risorse commerciali, relazione −20 | Una volta per turno per nazione |
| **💰 Richiedi Tributo** | — | Forza il pagamento (successo basato su rapporto di forza) | Una volta per turno per nazione, non su alleati |
| **🕊️ Negozia Pace** | Risorse variabili | Termina la guerra, auto-rimuove sanzioni | Il nemico decide le condizioni |

### Meccaniche di Sanzioni e Alleanze

- **Sanzioni**: permanenti finché non si firma una pace o un'alleanza
- **Fare pace**: rimuove automaticamente le sanzioni reciproche, relazione +20
- **Formare alleanza**: rimuove automaticamente le sanzioni reciproche, relazione +30
- **Rompere alleanza**: relazione −25 reciproca

### Tributo — Formula di Successo

```
powerRatio = tua_forza_atk / max(1, loro_forza_def)
successChance = min(0.80, powerRatio × 0.30 + (relazione < -30 ? 0.20 : 0))
```

- **Se accettano**: ricevi 20-50 💰, relazione −20 (😠)
- **Se rifiutano**: relazione −15 (😠)

---

## 🕵️ Spionaggio

> **Costo**: 💰30 + 🥇2

| Parametro | Valore |
|---|---|
| Probabilità base di successo | 60% |
| Con tecnologia `Cyberwarfare` | 80% |
| In caso di successo | Vedi risorse, esercito, tecnologie e relazioni del bersaglio |
| In caso di fallimento | Perdi le risorse, relazione −20 con il bersaglio |

---

## ☢️ Escalation Nucleare

Le armi nucleari sono le più devastanti del gioco ma hanno **conseguenze catastrofiche globali**.

### Requisiti

1. Ricerca la tecnologia `Programma Nucleare` (prerequisito: `Difesa Antimissile`)
2. Costruisci testate nucleari: 💰5000, ☢️50, 💎10 ciascuna

### Effetti di un Attacco Nucleare

| Effetto | Valore |
|---|---|
| Perdite difensore | 70-90% di TUTTE le forze |
| Territorio conquistato | ✅ Automatico |
| Stabilità globale | −25% |
| Sanzioni universali | 🚫 TUTTE le nazioni ti sanzionano |
| Relazione con tutti | −50 |

> Se colpisce la patria e il difensore ha colonie → **COLLASSO TOTALE**: tutti i territori ceduti, tesoro saccheggiato, esercito distrutto. Se non ha colonie, conquista normale.

---

## 🏆 Condizioni di Vittoria

| Tipo | Condizione | Difficoltà |
|---|---|---|
| 🗺️ **Vittoria Militare** | Controlla ≥ **40%** dei territori mondiali | ⭐⭐⭐⭐ |
| 💰 **Vittoria Economica** | Accumula ≥ **45.000 💰** E controlla ≥ 22% territori | ⭐⭐⭐⭐ |
| ⚓ **Vittoria Strategica** | Controlla **TUTTI** i 16 asset strategici | ⭐⭐⭐⭐⭐ |
| 👑 **Vittoria Egemonica** | Dal turno 35: ≥28% territori + distacco ≥15 dal 2° | ⭐⭐⭐ |
| 🤝 **Duopolio** | Le prime 2 nazioni controllano >70% della mappa → chi è in testa vince | ⭐⭐⭐ |
| ⏰ **Punteggio (T80)** | Al turno 80 chi ha più territori vince automaticamente | ⭐⭐ |

---

## 🤖 Intelligenza Artificiale

L'IA è costruita come un sistema **goal-driven** a 7 fasi, eseguito per ogni nazione ad ogni turno.

### Pipeline IA (7 Step per Turno)

1. **Raccolta risorse** — produzione automatica
2. **Valutazione strategica** — analisi di minacce, opportunità, alleati, forza relativa
3. **Economia** — costruzione unità adattata al goal corrente
4. **Diplomazia** — alleanze, sanzioni, pace (con logica anti-player coalition)
5. **Militare** — attacchi mirati basati su punteggio per territorio
6. **Ricerca** — scelta tecnologica orientata al goal
7. **Sedazione rivolte** — gestione automatica del malcontento

### Obiettivi Strategici dell'IA

L'IA sceglie un **goal** ogni turno basandosi sulla situazione:

| Goal | Quando scatta | Comportamento |
|---|---|---|
| 🏚️ **Reconquest** | Patria persa | Priorità assoluta: riconquistare la capitale |
| 🔧 **Consolidate** | Sovraestensione o ≥3 colonie critiche | Ferma espansione, seda rivolte, costruisci difese |
| 🛡️ **Defend** | Più minacce che alleati + nemici | Costruzione SAM, alleanze difensive |
| ⚔️ **Warfight** | Guerre attive | Focus su vincere le guerre in corso |
| 🌐 **Dominate** | Controlla ≥ 30% del mondo | Spinta aggressiva verso la vittoria |
| 📈 **Expand** | Default | Espansione opportunistica |

### Sistema di Punteggio Territori (Territory Scoring)

Ogni territorio raggiungibile riceve un punteggio composito:

| Fattore | Peso | Descrizione |
|---|---|---|
| 📦 **Valore risorse** | alto | Somma della produzione del territorio |
| ⚓ **Asset strategico** | molto alto | Bonus enorme se il territorio contiene un chokepoint |
| 🏚️ **Debolezza guarnigione** | alto | Guarnigioni più deboli = punteggio più alto |
| 🗺️ **Consolidamento confini** | medio | Bonus se il territorio connette i propri territori |
| ✂️ **Tagliare il nemico** | medio | Bonus se la conquista isola territori nemici |
| 🏠 **Riconquista patria** | massimo | Bonus enorme se è la propria homeland |
| 🤝 **Coordinamento alleati** | medio | Bonus se un alleato confina col bersaglio |

### 7 Profili di Personalità

| Profilo | Aggressione | Espansione | Diplomazia | Tech | Tolleranza Nuke |
|---|:---:|:---:|:---:|:---:|:---:|
| **Superpower** | 0.65 | 0.70 | 0.40 | 0.80 | 0.30 |
| **Regional** | 0.55 | 0.60 | 0.50 | 0.50 | 0.15 |
| **Defensive** | 0.15 | 0.15 | 0.80 | 0.90 | 0.05 |
| **Opportunist** | 0.45 | 0.55 | 0.40 | 0.30 | 0.10 |
| **Neutral** | 0.10 | 0.10 | 0.90 | 0.60 | 0.02 |
| **Unstable** | 0.70 | 0.40 | 0.15 | 0.15 | 0.50 |
| **Minor** | 0.20 | 0.15 | 0.50 | 0.20 | 0.00 |

---

### ⏩ Modalità Auto-Play

Il gioco include una modalità **Auto-Play** che permette di osservare la partita come spettatore.

| Situazione | Attivazione | Comportamento |
|---|---|---|
| 🎮 **Player vivo** | Bottone ⏩ nell'HUD | Il player viene controllato dall'IA (stessa pipeline a 7 step) |
| 💀 **Player eliminato** | Automatica | Il gioco continua senza il player, modalità spettatore |

**Come funziona:**
- Quando l'auto-play è attivo, la nazione del giocatore viene **aggiunta alla lista IA** e processata con lo stesso algoritmo delle altre nazioni
- L'IA usa il **profilo di personalità** della nazione scelta (es. USA = `superpower`, Italia = `defensive`)
- Il player raccoglie risorse, costruisce unità, fa diplomazia, attacca, ricerca e seda rivolte — tutto automaticamente
- La velocità delle animazioni è raddoppiata (×1.8) per rendere la visione più fluida
- È possibile **mettere in pausa** o **tornare al controllo manuale** in qualsiasi momento

> 💡 L'auto-play è utile per osservare come le dinamiche geopolitiche evolvono senza intervento umano, o per testare l'equilibrio del gioco.

---

## 🎲 Eventi Casuali

Alla fine di ogni turno IA, il sistema può generare eventi globali:

| Evento | Probabilità | Effetto |
|---|:---:|---|
| 🌍 **Terremoto** | 5% | Una nazione casuale perde 💰30 e 🔩10 |
| 🛢️ **Crisi Petrolifera** | 3% | TUTTE le nazioni perdono il 15% del petrolio |
| 🔬 **Svolta Tecnologica** | 2% | Una nazione casuale riceve +50 💰 |
| 🦠 **Pandemia** | 2% | TUTTE le nazioni perdono 🌾5 cibo |

---

## 🧭 Sistema di Raggiungibilità

Non tutti i territori sono raggiungibili via terra. Il gioco simula 5 metodi di proiezione di forza:

| Priorità | Metodo | Requisito | Quando |
|:---:|---|---|---|
| 1 | 🟢 **Terra** | Confine terrestre | I tuoi territori confinano col bersaglio |
| 2 | 🔵 **Mare** | 🚢 Flotta o 🐟 Sottomarino | Collegamento marittimo disponibile |
| 3 | ⛔ **Mare (bloccato)** | Nessuna nave | Collegamento marittimo esiste ma non hai navi |
| 4 | 🔴 **Missili** | 🚀 Missili o ☢️ Nuke | Nessun collegamento diretto |
| 5 | 🟡 **Aerei** | ✈️ Caccia, 🛩️ Bombardieri o 🤖 Droni | Nessun collegamento diretto |

> Le nazioni **isola** (🇯🇵 Giappone, 🇹🇼 Taiwan, 🇳🇿 Nuova Zelanda) richiedono navi, aerei o missili per essere attaccate.

---

## 🏰️ Assedio della Patria (Homeland Siege)

Quando una nazione perde la sua **patria** in battaglia ma controlla ancora **colonie**, non muore subito. Scatta un meccanismo di cessione:

1. L'attaccante calcola una **domanda** proporzionale alla sua forza militare
2. Il difensore **cede colonie** (dalla meno alla più preziosa) per soddisfare la domanda
3. Le colonie cedute vanno all'attaccante come bottino di guerra

### Esiti Possibili

| Scenario | Risultato |
|---|---|
| Colonie sufficienti a coprire la domanda | ✅ **Sopravvive**: si ritira nella colonia migliore rimasta |
| Colonie insufficienti | ❌ **Collasso totale**: l'attaccante prende TUTTO |

> Per ogni colonia ceduta, il difensore recupera 1-3 fanteria (truppe evacuate).

---

## 🕊️ Negoziazione di Pace

Quando chiedi la pace, il nemico calcola le **condizioni** basandosi su 7 fattori:

| Fattore | Descrizione |
|---|---|
| ⚔️ **Rapporto di forza** | Chi ha l'esercito più forte ora? |
| 🗺️ **Bilancio territoriale** | Chi controlla più territorio? |
| ⏳ **Stanchezza di guerra** | Guerre lunghe → richieste più basse (fino a −50% dopo ~8 turni) |
| 🎯 **Penalità aggressore** | Chi ha dichiarato guerra paga +35% |
| 😤 **Livello di odio** | Relazione molto negativa → richieste fino a +32% |
| 🏛️ **Dimensione impero** | Imperi grandi chiedono di più |
| 📦 **Scarsità risorse** | Il nemico chiede ciò di cui ha più bisogno |

### 4 Mood di Pace

| Mood | Moltiplicatore | Risorse aggiuntive |
|---|:---:|:---:|
| 🕊️ **Generoso** | ≤ 0.5× | 1 risorsa extra |
| ⚖️ **Equo** | 0.5× – 1.0× | 2 risorse extra |
| 💢 **Duro** | 1.0× – 1.8× | 3 risorse extra |
| 🔥 **Umiliante** | > 1.8× | 3 risorse extra (40% quota) |

---

## 🔬 Albero Tecnologico

12 tecnologie ricercabili con prerequisiti a catena:

```
                    ┌─ 🤖 Droni Avanzati ─── 👻 Stealth ─── ⚡ Ipersonici
                    │        └──────────── 🛰️ Ricognizione Spaziale
💻 Cyberwarfare ────┤
                    └──────── 🧠 AI Militare ◄──── (anche: Droni Avanzati)

📡 Difesa Antimissile ─── ☢️ Programma Nucleare

🛳️ Portaerei            (indipendente)
🌱 Energia Verde         (indipendente)
⛏️ Miniere Profonde      (indipendente)
🧬 Difesa Biologica      (indipendente)
```

| Tecnologia | Costo | Effetto |
|---|---|---|
| 🤖 Droni Avanzati | 💰800 ⚗️20 | +5 ATK droni |
| 👻 Stealth | 💰1200 ⚗️30 | +8 ATK caccia |
| ⚡ Missili Ipersonici | 💰2000 🔩60 ⚗️40 | +15 ATK missili crociera |
| 💻 Cyberwarfare | 💰600 ⚗️15 | +20% successo spionaggio (60%→80%) |
| 📡 Difesa Antimissile | 💰1500 🔩40 | +15 DEF sistemi SAM |
| ☢️ Programma Nucleare | 💰3000 ☢️30 | Sblocca costruzione testate nucleari |
| 🛳️ Portaerei | 💰2500 🔩80 | +10 ATK flotta navale |
| 🛰️ Ricognizione Spaziale | 💰1800 ⚗️25 | Visione globale (vedi tutti) |
| 🧠 AI Militare | 💰2200 ⚗️50 | +3 ATK tutte le unità |
| 🌱 Energia Verde | 💰1000 | +20 💰 produzione per turno |
| ⛏️ Miniere Profonde | 💰800 🔩30 | +30% risorse estrattive |
| 🧬 Difesa Biologica | 💰900 | +5 DEF tutte le unità |

---

## 🌐 Internazionalizzazione (i18n)

Il gioco supporta **Italiano** 🇮🇹 e **Inglese** 🇬🇧.

- Lingua rilevata automaticamente dal browser al primo avvio
- Cambio lingua in tempo reale dal menù impostazioni
- Tutti i nomi delle nazioni, le risorse, le unità, gli asset strategici e i messaggi dell'evento sono tradotti
- Le preferenze sono salvate in `localStorage`

---

## 🛠️ Struttura Tecnica

```
GeoDominium/
├── index.html              # Entry point HTML
├── terra-dominium.css      # Stili completi (dark theme, HUD militare)
├── README.MD               # Questo file
├── TODO.MD                 # Roadmap e task list
│
├── js/
│   ├── data.js             # 50 nazioni, ~180 minori, risorse, unità, tech, asset,
│   │                       #   profili IA, adjacency map, reachability system
│   ├── game-engine.js      # Motore: turni, risorse, combattimento, diplomazia,
│   │                       #   unrest, garrison, homeland siege, victory conditions
│   ├── ai.js               # IA strategica: 7-step pipeline, territory scoring,
│   │                       #   7 profili personalità, coalition logic
│   ├── ui.js               # Interfaccia completa: pannelli, popup, HUD, azioni
│   │                       #   diplomatiche, battaglia, spionaggio, commercio
│   ├── map-renderer.js     # Rendering mappa SVG mondiale, zoom/pan, click
│   ├── animations.js       # Traiettorie paraboliche missili, esplosioni,
│   │                       #   particelle, screen shake, effetti nucleari
│   ├── i18n.js             # Sistema i18n IT/EN, ~600 chiavi, data patching
│   ├── main.js             # Entry point, intro animata, orchestrazione
│   ├── devlog.js           # Logger di sviluppo
│   └── twemoji.min.js      # Parser emoji cross-platform
│
├── components/             # Web Components per UI modulare
│   ├── gd-event-log.js     # Log eventi scrollabile
│   ├── gd-battle-result.js # Risultati di battaglia
│   ├── gd-resource-bar.js  # Barra risorse HUD
│   ├── gd-military-bar.js  # Barra militare HUD
│   ├── gd-garrison-card.js # Card guarnigione
│   ├── gd-nation-badge.js  # Badge nazione
│   ├── gd-nation-legend.js # Legenda nazioni sulla mappa
│   ├── gd-turn-indicator.js# Indicatore turno
│   ├── event-bus.js        # Event bus inter-componenti
│   ├── event-bridge.js     # Bridge eventi engine↔UI
│   ├── gd-component.js     # Classe base componenti
│   └── index.js            # Barrel import
│
├── svg/                    # Mappa mondiale SVG
└── assets/
    └── emoji/              # ~336 SVG emoji flag (twemoji)
```

### Architettura

Il gioco è costruito con il pattern **IIFE Module** (Immediately Invoked Function Expression):

| Modulo | Pattern | Responsabilità |
|---|---|---|
| `GameEngine` | IIFE singleton | Stato di gioco, regole, turni |
| `AI` | IIFE singleton | Decisioni IA, scoring, pipeline |
| `UI` | IIFE singleton | Rendering, interazione utente |
| `MapRenderer` | IIFE singleton | SVG map, zoom/pan, selezione |
| `Animations` | IIFE singleton | Canvas 2D overlay, particelle |
| `I18n` | IIFE singleton | Traduzioni, settings persistence |
| `Components/*` | Web Components | UI riusabile (event log, bars, cards) |

---

## ✨ Feature Completa

- 🌍 **Mappa mondiale SVG** interattiva con zoom/pan e ~250 territori cliccabili
- 🏳️ **50 nazioni giocabili** con dati geopolitici reali + ~180 nazioni minori
- ⚓ **16 asset strategici** reali (Hormuz, Panama, Suez, Malacca, Gibilterra, Bosforo, Taiwan, Artico…)
- 💰 **10 risorse** reali: petrolio, gas, terre rare, oro, argento, diamanti, uranio, acciaio, cibo, fondi
- 🪖 **12 tipi di unità**: fanteria → corazzati → artiglieria → caccia → bombardieri → droni → flotta → sottomarini → missili crociera → missili balistici → SAM → testate nucleari
- 🔬 **12 tecnologie** con prerequisiti ad albero
- 🤖 **IA strategica goal-driven** con 7 profili di personalità e territory scoring
- ⚔️ **Combattimento dettagliato** con perdite su entrambi i lati, bottino, homeland siege
- 🤝 **Diplomazia completa**: alleanze, patti, sanzioni, embargo, tributi, pace negoziata
- 🕵️ **Spionaggio** con probabilità di successo e intelligence report
- ☢️ **Escalation nucleare** con conseguenze globali (sanzioni universali, crollo stabilità)
- 🔥 **Sistema di malcontento** con rivolte immediate e fine-turno
- 🏰 **Guarnigioni automatiche** con distribuzione pesata
- 🧭 **Raggiungibilità multi-metodo** (terra, mare, aria, missili)
- 💥 **Animazioni** traiettorie missili paraboliche, esplosioni con particelle, screen shake, effetti nuke
- 🌐 **Bilingue** IT/EN con rilevamento automatico
- 🎲 **Eventi casuali** (terremoti, crisi petrolifere, pandemie, scoperte tecnologiche)
- 🏆 **3 condizioni di vittoria** (militare, economica, strategica)
- 📊 **HUD completo** con barre risorse, militare, turno, log eventi

## 🎯 Zero Dependencies

| | |
|---|---|
| **Librerie esterne** | Nessuna — 100% Vanilla JavaScript |
| **Build step** | Nessuno — apri `index.html` e gioca |
| **Rendering** | SVG (mappa) + Canvas 2D (animazioni) |
| **Font** | Google Fonts (Orbitron, Rajdhani, Share Tech Mono) |
| **Emoji** | Twemoji (SVG locali per cross-platform consistency) |

---

## ⚠️ Disclaimer

Questa è una **simulazione ludica** a scopo di intrattenimento. Non rappresenta istruzioni operative reali su armi, strategie militari o procedure di difesa. I dati sulle risorse e sugli eserciti sono approssimativi e bilanciati per il gameplay, non per accuratezza storica.

---

## 📚 Riferimenti

- Mappa base: [BlankMap-World.svg](https://commons.wikimedia.org/wiki/File:BlankMap-World.svg) (Wikimedia Commons)
- Emoji: [Twemoji](https://twemoji.twitter.com/) (Twitter/X open source)
- Dati geopolitici: basati su fonti OSINT pubbliche, approssimati per bilanciamento
