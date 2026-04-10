# 🌍 TerraDominium — Global Strategic Warfare

Un gioco di strategia globale in JavaScript puro, ispirato a Risiko ma con dati reali: risorse vere (petrolio, gas, terre rare, oro, diamanti, uranio), asset strategici (Stretto di Hormuz, Canale di Panama, Canale di Suez, Stretto di Malacca, Bosforo) e arsenali militari completi (eserciti, aerei, droni, missili, sottomarini, testate nucleari).

## 🎮 Come Giocare

1. **Apri `index.html`** in un browser moderno (Chrome, Firefox, Edge)
2. **Scegli la tua nazione** tra 40 nazioni reali con risorse e forze militari uniche
3. **Gestisci l'economia**: risorse generate ogni turno, investi in tecnologia e produzione
4. **Conquista territori**: attacca nazioni nemiche con le tue forze, risoluzione probabilistica
5. **Ricerca tecnologie**: droni avanzati, missili ipersonici, stealth, cyberwarfare, nucleare
6. **Diplomazia**: alleanze, sanzioni, guerre — l'AI reagisce in tempo reale alle tue azioni
7. **Vinci**: conquista il 70% dei territori o controlla tutti gli asset strategici

---

## ⚙️ Meccaniche di Gioco

### 🏰 Sistema di Guarnigione

L'esercito è **nazionale**: le truppe non si assegnano manualmente ai singoli territori, ma vengono distribuite automaticamente in base a un sistema di **pesi strategici**.

#### Distribuzione Truppe

| Tipo di territorio | Peso | Logica |
|---|:---:|---|
| 🏠 **Patria** (homeland) | `2×` | Difesa prioritaria della capitale |
| ⚔️ **Fronte di guerra** (confina con nemico) | `1.5×` | Rinforzo automatico ai confini |
| 🌍 **Tutti gli altri** | `1×` | Distribuzione base |

> **Formula**: `truppe_territorio = esercito_totale × (peso_territorio / somma_pesi)`

#### Livelli di Forza

| Truppe assegnate | Livello | Bonus Difesa | Mod. Malcontento |
|:---:|---|:---:|:---:|
| ≥ 15 | 🟦 **HEAVY** | +25% | −6 / turno |
| 6 – 14 | 🟨 **MEDIUM** | +12% | −4 / turno |
| 1 – 5 | 🟧 **LIGHT** | +5% | −2 / turno |
| 0 | 🟥 **NONE** | −10% ⚠️ | +5 / turno ⚠️ |

#### Come Rafforzare un Territorio

1. **Produci più unità** → più truppe totali = più guarnigione per territorio
2. **Espanditi con cautela** → le truppe si diluiscono su troppi territori
3. **Riduci le guerre attive** → meno fronti = concentrazione difensiva
4. **Ricerca tecnologie** → `Deep Mining` (+30% risorse) e `Green Energy` (+20💰/turno) generano risorse per produrre unità
5. **Controlla asset strategici** → bonus risorse aggiuntive

---

### 🔥 Sistema di Malcontento (Unrest)

I territori conquistati accumulano **malcontento** ogni turno. Al 100% → **rivolta automatica** e il territorio torna alla nazione originale.

#### Accumulo per Turno (fine turno)

| Fattore | Effetto |
|---|:---:|
| Base | +3 |
| Nazione originale ancora viva | +4 |
| Ogni guerra attiva (max 4) | +1 ciascuna |
| Guarnigione Heavy | −6 |
| Guarnigione Medium | −4 |
| Guarnigione Light | −2 |
| Nessuna guarnigione | +5 |

#### ⚡ Rivolte Immediate (mid-turn)

Dopo **ogni conquista**, il sistema ricalcola le guarnigioni in tempo reale. Se le colonie restano sguarnite perché le truppe si sono diluite su troppi fronti, scatta un **picco di malcontento immediato** — potenzialmente causando rivolte durante il turno stesso.

| Guarnigione post-conquista | Picco Unrest | Con nazione viva (×1.4) |
|---|:---:|:---:|
| 🟥 NONE (0 truppe) | +12 | +17 |
| 🟧 LIGHT (1-5 truppe) | +6 | +8 |
| 🟨 MEDIUM (6-14 truppe) | +2 | +3 |
| 🟦 HEAVY (≥15 truppe) | 0 | 0 |

> **Effetto strategico**: non puoi fare "blitz" conquistando 10 territori di fila senza conseguenze. Ogni conquista diluisce le guarnigioni, e le colonie più deboli possono rivoltarsi immediatamente.

#### Azione: Seda Rivolta

> **Costo**: 💰 15 + 🪖 2 fanteria → riduce il malcontento di **40 punti**

#### Soglie di Pericolo

| Malcontento | Stato | Colore |
|:---:|---|---|
| 0 – 39% | 🟢 Basso | Verde |
| 40 – 59% | 🟡 Medio | Giallo |
| 60 – 79% | 🟠 Alto | Arancione |
| 80 – 100% | 🔴 Critico — rivolta imminente! | Rosso |

---

### 💰 Sistema Economico

- Ogni territorio produce risorse ogni turno in base ai propri dati reali
- I territori **conquistati producono il 70%** del valore base (penalità occupazione)
- Le **sanzioni** riducono la produzione del −5% per ogni nazione sanzionante
- Le **tecnologie** possono aumentare le entrate:
  - `Green Energy` → +20 💰/turno
  - `Deep Mining` → +30% risorse estrattive (petrolio, gas, oro, argento, diamanti, uranio, terre rare)
- Gli **asset strategici** (Hormuz, Panama, Suez, ecc.) danno bonus risorse aggiuntive

---

### ⚔️ Sistema di Combattimento

1. **Potenza ATK** dell'attaccante vs **Potenza DEF** del difensore
2. Il difensore ha un **bonus terreno del +20%**
3. La **guarnigione locale** modifica la difesa (da −10% a +25%)
4. **Fattore casuale ±30%** per imprevedibilità
5. In caso di vittoria: **bottino di risorse** proporzionale ai territori del difensore
6. **Gli armamenti nemici vengono distrutti** in battaglia — non si ereditano unità
7. Metodi d'attacco multipli: terra, mare, aria, missili, cyber, nucleare — ognuno con requisiti e portata diversi

#### Bottino di Guerra

| Situazione | Risorse | Armamenti |
|---|---|---|
| Conquista normale | Quota proporzionale (80-100%) | ❌ Distrutti |
| Collasso totale (homeland) | 100% risorse | ❌ Distrutti |
| Conquista con homeland sopravvissuta | Quota ridotta (70-90%) | ❌ Distrutti |

---

## ✨ Features

- 🌍 Mappa mondiale SVG interattiva con zoom/pan
- 🏳️ 40 nazioni con risorse reali e forze militari
- ⚓ 10 asset strategici veri (Hormuz, Panama, Suez, Malacca, etc.)
- 💰 10 tipi di risorse: petrolio, gas, terre rare, oro, argento, diamanti, uranio, acciaio, cibo, fondi
- 🪖 12 tipi di unità: fanteria, corazzati, artiglieria, caccia, bombardieri, droni, flotta, sottomarini, missili crociera, missili balistici, SAM, testate nucleari
- 🔬 12 tecnologie ricercabili (droni avanzati, stealth, ipersonici, cyberwarfare, nucleare, etc.)
- 🤖 AI reattiva: difesa, contrattacco, alleanze, coalizioni anti-player
- 💥 Animazioni: traiettorie missili paraboliche, esplosioni con particelle, screen shake, effetti nucleari
- 🤝 Sistema diplomatico: alleanze, sanzioni, dichiarazioni di guerra
- ☢️ Escalation nucleare con conseguenze globali (sanzioni universali, crollo stabilità)
- 🎲 Eventi casuali: crisi economiche, tsunami, scoperte minerarie, summit ONU
- 🏆 Condizioni di vittoria multiple: dominio territoriale (70%), controllo asset strategici, apocalisse nucleare (game over per tutti)

## 🛠️ Struttura Tecnica

```
TerraDominium/
├── index.html          # Entry point
├── terra-dominium.css  # Stili (dark theme, HUD militare)
├── README.MD
└── js/
    ├── data.js         # Nazioni, risorse, unità, tecnologie, asset strategici
    ├── map-renderer.js # Rendering mappa SVG, zoom/pan, interazione
    ├── game-engine.js  # Motore di gioco: turni, risorse, combattimento, vittoria
    ├── ai.js           # IA: personalità, produzione, attacco, diplomazia
    ├── animations.js   # Effetti visivi: missili, esplosioni, particelle
    ├── ui.js           # Interfaccia: pannelli, popup, HUD, selezione
    └── main.js         # Entry point JS, animazione intro
```

## 🎯 Zero Dependencies

- **Nessuna libreria esterna** — tutto JavaScript puro (Vanilla JS)
- **Nessun build step** — apri direttamente `index.html`
- **SVG + Canvas 2D** per rendering mappa ed effetti visivi
- **Google Fonts** per tipografia (Orbitron, Rajdhani, Share Tech Mono)

## ⚠️ Disclaimer

Questa è una **simulazione ludica** a scopo di intrattenimento. Non rappresenta istruzioni operative reali su armi, strategie militari o procedure di difesa. I dati sulle risorse sono approssimativi e usati per bilanciamento di gioco.

---
## Riferimenti mappa

- Mappa base: `https://commons.wikimedia.org/wiki/File:BlankMap-World.svg`
