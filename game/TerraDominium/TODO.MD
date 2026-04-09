# TerraDominium — Prompt per AI

Questo file raccoglie prompt approfonditi da dare a un’AI per sviluppare il progetto in modo ordinato e coerente.

## 1. Rebranding del progetto

**Prompt:**
Rinomina il progetto da `TerraDominium` a `GeoDominion` in tutti i punti del codice, dell’interfaccia utente, dei titoli, dei testi visibili e della documentazione. Mantieni coerenza completa tra nomi file, riferimenti interni, testo nell’UI e materiali descrittivi. Se esistono riferimenti obsoleti al vecchio nome, sostituiscili senza rompere i collegamenti esistenti.



## 3. Nomi completi delle nazioni

**Prompt:**
Rimuovi ovunque gli acronimi a due lettere e mostra sempre il nome completo di ogni nazione. Aggiorna tooltip, leggenda, sidebar, popup, log eventi e qualsiasi etichetta sulla mappa. Se serve, conserva internamente gli ID brevi per la logica del gioco, ma non mostrarli mai all’utente finale.

## 4. Ottimizzazione prestazioni

**Prompt:**
Analizza il codice del gioco e individua le principali cause di lentezza, animazioni a scatti e aggiornamenti inutili. Proponi e implementa ottimizzazioni mirate: riduzione dei redraw, caching dei calcoli, aggiornamenti meno frequenti, gestione più efficiente delle animazioni e miglior uso delle risorse grafiche. L’obiettivo è rendere il gioco più fluido senza cambiare la logica di base.

## 5. Layout sidebar e leggenda

**Prompt:**
Correggi il layout della sidebar e della leggenda della mappa, che attualmente si sovrappongono in modo errato. Progetta una nuova disposizione che funzioni bene sia su desktop sia su mobile. La sidebar deve rimanere leggibile e accessibile, la leggenda deve restare consultabile e non deve coprire altri elementi importanti dell’interfaccia.

## 6. Bounding box della mappa

**Prompt:**
Implementa una bounding box visiva per la mappa in modo che il mondo resti contenuto entro i suoi confini naturali. Tutto ciò che si trova fuori dalla mappa deve avere il colore del mare, senza lasciare vuoti o sfondi incoerenti. La soluzione deve sembrare pulita, stabile e coerente con il resto del design.

## 7. Modalità spettatore e anno della sconfitta

**Prompt:**
Migliora la modalità spettatore. Dove compare la scritta `ELIMINATO — Modalità spettatore`, aggiungi anche l’anno in cui il giocatore è stato sconfitto. Progetta un meccanismo di calcolo intelligente e coerente con il sistema a turni, assumendo ad esempio che un turno equivalga a un anno. Il risultato deve essere credibile e facilmente comprensibile dall’utente.

## 8. Icone risorse

**Prompt:**
Rivedi le icone delle risorse per evitare confusione visiva. I diamanti devono usare un’icona dedicata e distinta. Le terre rare devono avere una nuova icona chiara e diversa da quella dei diamanti. Aggiorna anche eventuali badge, simboli nella sidebar e rappresentazioni nei popup per mantenere uniformità grafica.

## 9. Dati realistici con incertezza

**Prompt:**
Rendi il sistema di simulazione più realistico introducendo dati basati su risorse, materie prime e potenza militare verosimili per ogni stato. I valori devono essere plausibili ma non perfettamente precisi: aggiungi un margine di incertezza per simulare informazioni non totalmente affidabili. La simulazione deve restare bilanciata e interessante, evitando valori troppo deterministici o troppo rigidi.

## 10. Conquista e trasferimento esercito

**Prompt:**
Modifica la logica di conquista in modo che, quando uno stato viene occupato, il conquistatore acquisisca anche il suo esercito residuo. Definisci chiaramente cosa succede alle unità sopravvissute, come vengono sommate o trasferite e come la UI deve aggiornarsi dopo la conquista. La regola deve essere semplice da capire e consistente con il resto delle meccaniche.

## 11. Rivolte interne e guerre civili

**Prompt: FATTO**
Aggiungi una meccanica di rivolte interne e guerre civili nei territori occupati. La probabilità di insurrezione deve dipendere dalla forza del presidio militare presente nel territorio e dal livello di controllo occupante. Se il presidio è troppo debole, la popolazione può ribellarsi e tentare di rovesciare il regime occupante. Le truppe lasciate sul territorio devono contribuire sia alla difesa dagli attacchi esterni sia al contenimento delle rivolte interne. La logica deve essere credibile, bilanciata e visibile al giocatore.





## 13. Pulsante Spia con popup

**Prompt:**
Quando il giocatore clicca su `Spia`, oltre a registrare l’evento nell’event log, mostra anche un popup o pannello informativo dedicato. Il popup deve visualizzare il risultato della spia in modo chiaro, immediato e visivamente coerente con il resto dell’interfaccia. Se utile, includi dettagli su risorse, esercito, stabilità o informazioni strategiche ottenute.

## 14. Tooltip con nome nazione

**Prompt:**
Aggiorna il comportamento del `title` o del tooltip al passaggio del mouse in modo che mostri sempre il nome completo della nazione, non l’acronimo. Il tooltip deve funzionare in modo uniforme su tutta la mappa, nella sidebar e nei componenti interattivi collegati ai territori o alle nazioni.

## 15. Prompt sintetico master

**Prompt:**
Lavora su `GeoDominion` come se fosse una strategia globale realistica e fluida. Migliora grafica, animazioni, leggibilità, prestazioni e interazioni. Mostra nomi completi delle nazioni, icone corrette per risorse, truppe visibili sui territori, logica più credibile per conquista, occupazione, rivolte interne e modalità spettatore con anno di sconfitta. Ogni modifica deve essere coerente, ottimizzata e pronta per una UX più professionale.

## 16. Obiettivo strategico delle AI

**Prompt:**
Le AI non devono mai puntare allo stallo: ogni nazione deve avere come obiettivo finale la conquista del mondo. Durante la simulazione, ogni AI deve cercare di non perdere il proprio territorio di appartenenza e, se è ancora viva, deve provare a riconquistarlo con priorità alta per senso di appartenenza. Le decisioni strategiche devono favorire espansione, difesa del nucleo storico e riconquista dei territori perduti, evitando comportamenti passivi o neutri troppo a lungo.

## 12. Truppe visibili sul territorio
utilizza mezzi, torri per airdome, lanciamissili, etc.

## 2. Visualizzazione combattimenti

**Prompt:**
Migliora la resa visiva degli attacchi in modo realistico e leggibile. Gli attacchi terrestri devono mostrare carri armati o mezzi corazzati in movimento lungo la traiettoria. Gli attacchi aerei devono mostrare missili o ordigni in volo. Le esplosioni devono avere effetti visivi chiari con fuoco, particelle e impatto percepibile. Mantieni le animazioni coerenti con il tono strategico del gioco e ottimizzale per evitare scatti.

**Prompt:**
Modfica la logica, si attaccare le nazioni non confinanti solo se si hanno missili o droni o altri strimenti, o via mare se sono collegate tramite mare. altrimenti dare un allert che dice che non è attabile e con quale motivazione. via terra con i mezzi è possibile se ci sono navi che li trasportano attraversio il male, o se sono confinanti.
