# 🌍 TerraDominium — Global Strategic Warfare

Un gioco di strategia globale in JavaScript puro, ispirato a Risiko ma con dati reali: risorse vere (petrolio, gas, terre rare, oro, diamanti, uranio), asset strategici (Stretto di Hormuz, Canale di Panama, Canale di Suez, Stretto di Malacca, Bosforo) e arsenali militari completi (eserciti, aerei, droni, missili, sottomarini, testate nucleari).

## 🎮 Come Giocare

1. **Apri `index.html`** in un browser moderno (Chrome, Firefox, Edge)
2. **Scegli la tua nazione** tra 40 nazioni reali con risorse e forze militari uniche
3. **Gestisci l'economia**: risorse generate ogni turno, investi in tecnologia e produzione
4. **Conquista territori**: attacca nazioni nemiche con le tue forze, risoluazione probabilistica
5. **Ricerca tecnologie**: droni avanzati, missili ipersonici, stealth, cyberwarfare, nucleare
6. **Diplomazia**: alleanze, sanzioni, guerre — l'AI reagisce in tempo reale alle tue azioni
7. **Vinci**: conquista il 70% dei territori o controlla tutti gli asset strategici

## ✨ Features

- 🌍 Mappa mondiale interattiva con zoom/pan (Canvas)
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
    ├── map-renderer.js # Rendering mappa Canvas, zoom/pan, interazione
    ├── game-engine.js  # Motore di gioco: turni, risorse, combattimento, vittoria
    ├── ai.js           # IA: personalità, produzione, attacco, diplomazia
    ├── animations.js   # Effetti visivi: missili, esplosioni, particelle
    ├── ui.js           # Interfaccia: pannelli, popup, HUD, selezione
    └── main.js         # Entry point JS, animazione intro
```

## 🎯 Zero Dependencies

- **Nessuna libreria esterna** — tutto JavaScript puro (Vanilla JS)
- **Nessun build step** — apri direttamente `index.html`
- **Canvas 2D** per rendering performante
- **Google Fonts** per tipografia (Orbitron, Rajdhani, Share Tech Mono)

## ⚠️ Disclaimer

Questa è una **simulazione ludica** a scopo di intrattenimento. Non rappresenta istruzioni operative reali su armi, strategie militari o procedure di difesa. I dati sulle risorse sono approssimativi e usati per bilanciamento di gioco.

---
## Riferimenti mappa

- Mappa base: `https://commons.wikimedia.org/wiki/File:BlankMap-World.svg`
