/* ═══════════════════════════════════════════════════════
   GeoDominion — i18n  (Internationalisation + Settings)
   ═══════════════════════════════════════════════════════
   • Two-language dictionary: IT (default) and EN
   • Detects browser language at first load
   • Persists language + other settings in localStorage
   • Provides t(key, params) for JS-side translation
   • Provides applyI18n() for HTML data-i18n attributes
   ═══════════════════════════════════════════════════════ */

const I18n = (() => {
    'use strict';

    const STORAGE_KEY = 'geodominion_settings';

    /* ── Default settings ── */
    const DEFAULTS = {
        lang: _detectLang(),
        autoScrollLog: true,
        musicVolume: 0.5,
        sfxVolume: 0.7
    };

    let _settings = {};
    let _lang = 'it';

    /* ── Detect browser language → 'it' or 'en' ── */
    function _detectLang() {
        const nav = (navigator.language || navigator.userLanguage || 'it').toLowerCase();
        return nav.startsWith('en') ? 'en' : 'it';
    }

    /* ═══════════════ DICTIONARIES ═══════════════ */

    const _dict = {
        /* ═══════════ ITALIAN ═══════════ */
        it: {
            /* ── Intro screen ── */
            intro_subtitle:       'GUERRA STRATEGICA GLOBALE',
            intro_disclaimer:     'Simulazione ludica — non rappresenta istruzioni operative reali.',
            intro_play:           '🎮 GIOCA',
            intro_howto:          '📖 COME SI GIOCA',

            /* ── Nation select ── */
            select_title:         'SCEGLI LA TUA NAZIONE',
            select_subtitle:      'Seleziona una nazione per iniziare la conquista globale',
            select_back:          '← Indietro',
            select_start:         '🚀 INIZIA',
            preview_resources:    'Risorse iniziali',
            preview_army:         'Esercito',
            preview_techs:        'Tecnologie',
            preview_power:        'Potenza',
            preview_territories:  'Territori',
            preview_neighbors:    'Confini con',
            preview_assets:       'Asset strategici',
            preview_profile:      'Profilo',

            /* ── Tutorial ── */
            tutorial_title:       '📖 COME SI GIOCA',
            tut_step1_title:      '1. Scegli la Nazione',
            tut_step1:            '50 nazioni giocabili, ognuna con 10 risorse: fondi, petrolio, gas, terre rare, oro, argento, diamanti, uranio, acciaio e cibo. Controlla asset strategici (Hormuz, Panama, Suez, Malacca…) per ottenere bonus produttivi ogni turno.',
            tut_step2_title:      '2. Economia e Produzione',
            tut_step2:            'Le risorse si accumulano ogni turno in base ai territori controllati. I territori occupati producono solo il 70%. Investi in 12 tecnologie (droni, stealth, missili ipersonici, nucleare, cyberwarfare…) e costruisci 12 tipi di unità: fanteria, corazzati, artiglieria, caccia, bombardieri, droni, flotta navale, sottomarini, missili crociera, balistici, sistemi SAM e testate nucleari.',
            tut_step3_title:      '3. Combattimento e Intelligence',
            tut_step3:            'Attacca nazioni nemiche: ogni unità ha ATK, DEF, velocità, raggio e costo. Il combattimento è probabilistico con bonus difensivi per le grandi potenze. Puoi anche inviare spie (🕵️) per scoprire risorse e forze nemiche, o imporre sanzioni economiche (−5% produzione per sanzione).',
            tut_step4_title:      '4. Diplomazia e Colonie',
            tut_step4:            'Stringi alleanze, dichiara guerre, imponi embargo, negozia patti e commerci risorse. I territori conquistati diventano colonie: producono meno, subiscono malcontento crescente e possono rivoltarsi se il malcontento raggiunge il 100%. Seda le rivolte con le truppe!',
            tut_step5_title:      '5. Intelligenza Artificiale',
            tut_step5:            'Le nazioni IA hanno personalità diverse (superpotenza, difensiva, opportunista, instabile…). Si difendono, formano alleanze, ricercano tecnologie e contrattaccano. Puoi anche attivare l\'autoplay e lasciar giocare l\'IA al posto tuo.',
            tut_step6_title:      '6. Condizioni di Vittoria',
            tut_step6:            '<strong>Vittoria Militare:</strong> conquista l\'85% dei territori. <strong>Vittoria Economica:</strong> accumula 50.000 fondi controllando almeno il 30% della mappa. <strong>Vittoria Strategica:</strong> controlla tutti gli asset strategici globali. Attento all\'economia: senza risorse, crolla tutto.',

            /* ── HUD ── */
            hud_turn:             'Turno',
            hud_end_turn:         '⏭️ TURNO',
            hud_end_turn_title:   'Fine Turno',
            hud_autoplay_title:   'Auto-play: l\'IA gioca al posto tuo',
            hud_economy_title:    'Panoramica Economica',
            hud_production_title: 'Produci Unità',
            hud_tech_title:       'Ricerca Tecnologica',
            hud_diplomacy_title:  'Diplomazia',
            hud_colonies_title:   'Gestione Colonie',
            hud_settings_title:   'Impostazioni',

            /* ── Right panel ── */
            events_title:         '📋 EVENTI',
            events_fullscreen:    'Schermo intero',
            events_show:          'Mostra eventi',
            btn_live:             '🔴 LIVE',

            /* ── Popup titles ── */
            battle_title:         '⚔️ BATTAGLIA',
            tech_title:           '🔬 ALBERO TECNOLOGICO',
            diplomacy_title:      '🤝 DIPLOMAZIA',
            production_title:     '🏭 PRODUCI UNITÀ',
            economy_title:        '📊 PANORAMICA ECONOMICA',
            trade_title:          '💱 SCAMBIA RISORSE',
            trade_desc:           'Scambia risorse con',
            trade_refused:        'rifiutato',
            peace_title:          '🕊️ NEGOZIATO DI PACE',
            spy_title:            '🕵️ INTELLIGENCE',
            colonies_title:       '🏛️ GESTIONE COLONIE',
            revolt_title:         '🔥 ALLERTA RIVOLTA',

            /* ── Buttons ── */
            btn_close:            'CHIUDI',
            btn_restart:          '🔄 RICOMINCIA',
            btn_view_map:         '🗺️ VEDI MAPPA',
            btn_attack:           '⚔️ Attacca',
            btn_propose_peace:    '🕊️ Proponi pace',
            btn_ally:             '🤝 Alleati',
            btn_annex:            '🏳️ Annetti',

            /* ── Side panel (territory) ── */
            panel_owner:          'Proprietario',
            panel_relation:       'Relazione',
            panel_garrison:       'Guarnigione',
            panel_unrest:         'Malcontento',
            panel_your_territory: '🏠 Tuo territorio',
            panel_allied:         '🤝 Alleato',
            panel_at_war:         '⚔️ In guerra',
            panel_wait_turn:      'Aspetta il tuo turno…',
            panel_resources:      'Risorse',
            panel_production:     'Produzione',
            panel_strategic:      'Asset strategici',
            panel_military_actions: 'Azioni Militari',
            panel_diplomacy:      'Diplomazia',
            panel_economy:        'Economia',
            panel_territory_ctrl: 'Controllo Territorio',
            panel_suppress:       '🛡️ Seda Rivolta',
            panel_quick_attack:   '⚔️ Attacco Rapido',
            panel_nuke_strike:    '☢️ Attacco Nucleare',

            /* ── Nation detail / territory panel ── */
            nd_conquered:         '⚔ Conquistati ({n})',
            nd_garrison_title:    'Guarnigione',
            nd_resources_title:   '💰 RISORSE',
            nd_intel_unavailable: 'Intelligence non disponibile',
            nd_military_title:    '🪖 FORZE MILITARI',
            nd_army_title:        '🪖 ESERCITO',
            nd_no_units:          'Nessuna unità',
            nd_total:             '⚔️ Totale',
            nd_atk_power:         '⚔️ Potenza Attacco',
            nd_def_power:         '🛡️ Potenza Difesa',
            nd_garrison:          '🏰 GUARNIGIONE',
            nd_units:             'unità',
            nd_defense:           '🛡️ Difesa',
            nd_unrest_label:      '🔥 Malcont.',
            nd_dominant:          'Dominante',
            nd_homeland:          '🏠 Patria',
            nd_front:             '⚔️ Fronte',
            nd_rear:              '🌍 Retro',
            nd_unrest_discontent: '🔥 Malcontento',
            nd_unrest_critical:   'CRITICO',
            nd_unrest_high:       'ALTO',
            nd_unrest_medium:     'MEDIO',
            nd_unrest_low:        'BASSO',
            nd_revolt_warning:    '⚠ Rivolta a 100% — rafforza la guarnigione!',
            nd_no_garrison:       'Nessuna guarnigione',
            nd_no_garrison_desc:  'Malcontento +5/turno · Difesa −10%',
            nd_reachability:      '📡 RAGGIUNGIBILITÀ',
            nd_unreachable:       '🚫 Non raggiungibile',

            /* ── Mid-turn revolt alert ── */
            revolt_mid_one:       'UN TERRITORIO SI È RIBELLATO!',
            revolt_mid_many:      '{n} TERRITORI SI SONO RIBELLATI!',
            revolt_mid_desc:      'Le tue truppe sono troppo sparse — le guarnigioni non riescono a mantenere il controllo. Ogni conquista indebolisce le difese delle colonie esistenti!',
            revolt_mid_lost:      'PERSO',
            revolt_mid_yielded:   '🏳️ Ceduto',
            revolt_mid_collapse:  '💀 Collasso',
            revolt_mid_retreat:   '🛡️ Ritirata!',

            /* ── Trade ── */
            trade_refused_label:  '🚫 rifiutato',
            trade_refused_msg:    '{name} rifiuta lo scambio! (non riprovabile questo turno)',

            /* ── AI event-log verbs ── */
            evt_ai_declares_war:  'dichiara guerra a',
            evt_ai_alliance:      'alleanza con',
            evt_ai_peace:         'pace con',
            evt_ai_nuke:          'nucleare su',
            evt_ai_sanction:      'sanziona',
            evt_ai_research:      'ricerca',
            evt_ai_betray:        'tradisce',
            evt_ai_revolt:        'RIVOLTA!',
            evt_ai_revolt_taken:  'Territorio strappato a',
            evt_ai_suppress:      'seda rivolta in',
            evt_ai_eliminated:    'è stata eliminata!',
            evt_ai_cedes:         'cede {n} colonie:',
            evt_ai_survives:      'sopravvive! Si ritira a',
            evt_ai_collapse:      'COLLASSO TOTALE!',
            evt_ai_conquers_all:  'conquista tutto',
            evt_ai_win:           'VITTORIA',
            evt_ai_lose:          'SCONFITTA',

            /* ── Tooltips / preview / summary ── */
            tt_units:             'unità',
            tt_no_garrison:       '⚠ SENZA GUARNIGIONE',
            preview_power:        'Potenza',
            preview_funds:        '💰 Fondi',
            preview_oil:          '🛢️ Petrolio',
            preview_steel:        '🔩 Acciaio',
            preview_army:         '🪖 Esercito',
            preview_profile:      'Profilo',
            diplo_summary:        '🌍{terr} territori | ⚔️{atk} potenza | 🤝{allies} alleati | 🔥{wars} guerre',
            suppress_partial:     '⚠️ Sedate {done} rivolte, risorse insufficienti per le restanti {left}',

            /* ── War fatigue ── */
            fatigue_title:        '⚡ FATICA BELLICA ({n}° attacco)',
            fatigue_desc:         'Le tue truppe sono stanche. Prossimo attacco:',
            fatigue_penalty:      'Penalità potenza',

            /* ── Reachability alert ── */
            reach_impossible:     '🚫 ATTACCO IMPOSSIBILE',
            reach_target:         'Obiettivo',
            reach_tip_title:      '💡 Suggerimento:',
            reach_tip_body:       'Costruisci unità navali (🚢 Flotta, 🐟 Sottomarino) per trasporto via mare, o unità aeree (✈️ Caccia, 🛩️ Bombardiere, 🤖 Drone) e missili (🚀) per attacchi a lunga distanza.',

            /* ── Trade success ── */
            trade_success:        'Scambio riuscito!',
            per_turn_label:       '/turno',
            ai_turn_label:        '🤖 TURNO AI — T{n}',
            player_eliminated:    '💀 {flag} {name} È STATO ELIMINATO! Modalità spettatore attiva.',

            /* ── Badges & tooltips ── */
            badge_your_territory: '👑 TUO TERRITORIO',
            badge_your_nation:    '👑 LA TUA NAZIONE',
            badge_at_war:         '⚔️ IN GUERRA',
            badge_allied:         '🤝 ALLEATO',
            badge_eliminated:     '💀 ELIMINATO',
            badge_enemy:          '⚔️ NEMICO',
            badge_relation:       'Relazione',
            tt_tap_details:       '👆 Tocca per i dettagli',
            nd_territories:       '🌍 TERRITORI ({n})',
            nd_no_territories:    'Nessun territorio',
            nl_title:             '🗺️ NAZIONI',

            /* ── Animation labels ── */
            anim_conquered:       'CONQUISTATO!',
            anim_repelled:        'RESPINTO',
            anim_attacks:         'ATTACCA',
            anim_nuke_strike:     'ATTACCO NUCLEARE!',
            anim_revolt:          '🔥 RIVOLTA!',

            /* ── Diplomacy actions ── */
            diplo_declare_war:    '⚔️ Dichiara Guerra',
            diplo_ally:           '🤝 Proponi Alleanza',
            diplo_break_ally:     '💔 Rompi Alleanza',
            diplo_non_aggression: '📝 Patto di Non Aggressione',
            diplo_trade:          '💱 Scambia Risorse',
            diplo_sanction:       '🚫 Imponi Sanzioni',
            diplo_embargo:        '⛔ Embargo Commerciale',
            diplo_tribute:        '💰 Richiedi Tributo',
            diplo_spy:            '🕵️ Spionaggio',
            diplo_peace:          '🕊️ Proponi Pace',
            diplo_section_war:    'IN GUERRA',
            diplo_section_allies: 'ALLEATI',
            diplo_section_others: 'ALTRE NAZIONI',

            /* ── Production ── */
            prod_current_army:    '🪖 ESERCITO ATTUALE',
            prod_power:           'Potenza',
            prod_build:           '🏭 COSTRUISCI',
            prod_requires:        '🔒 Richiede',
            prod_consumable:      '⚡ Consumabile',
            prod_nuclear:         '☢️ Nucleare',
            prod_range:           'Raggio',

            /* ── Tech ── */
            tech_researched:      '✅ Ricercata',
            tech_available:       'Disponibile',
            tech_locked:          '🔒 Bloccata',
            tech_requires:        'Richiede',
            tech_research:        'RICERCA',
            tech_tier_base:       'Base',
            tech_tier_adv:        'Avanzate',
            tech_tier_elite:      'Élite',

            /* ── Battle result ── */
            btl_victory:          '✅ VITTORIA',
            btl_victory_conq:     '✅ VITTORIA — Territorio conquistato!',
            btl_defeat:           '❌ SCONFITTA — Ritirata!',
            btl_loot:             '📦 Bottino di guerra',
            btl_attack_cost:      'attacco',
            btl_fatigue:          'Fatica',

            /* ── Game over ── */
            go_you_won:           '🏆 HAI VINTO!',
            go_you_lost:          '💀 HAI PERSO!',
            go_won:               'HA VINTO!',
            go_dominates:         'domina il mondo!',
            go_conquered:         'ha conquistato il dominio globale.',
            go_conquered_turn:    'ha conquistato il dominio globale al turno',
            go_winner:            'Vincitore',
            go_turns:             'Turni',
            go_territories:       'Territori',
            go_funds:             'Fondi',
            go_victory_type:      'Tipo di Vittoria',
            vic_military:         'VITTORIA MILITARE',
            vic_military_desc:    'Dominazione territoriale (≥85% territori)',
            vic_economic:         'VITTORIA ECONOMICA',
            vic_economic_desc:    'Supremazia economica (≥50K fondi + ≥30% territori)',
            vic_strategic:        'VITTORIA STRATEGICA',
            vic_strategic_desc:   'Controllo di tutti gli asset strategici',

            /* ── Spy ── */
            spy_success:          '🕵️ MISSIONE RIUSCITA',
            spy_failure:          '🕵️ MISSIONE FALLITA',
            spy_captured:         'Agente catturato!',
            spy_intercepted:      'La tua spia è stata intercettata in',
            spy_relations_down:   '📉 Relazioni deteriorate',
            spy_resources:        '📦 Risorse',
            spy_army:             '🪖 Esercito',
            spy_techs:            '🔬 Tecnologie',
            spy_diplomacy:        '🌐 Diplomazia',
            spy_allies:           '🤝 Alleati',
            spy_at_war_with:      '⚔️ In guerra con',
            spy_no_resource:      'Nessuna risorsa rilevante',
            spy_no_units:         'Nessuna unità',
            spy_cost:             'Spionaggio (30💰 + 2🥇)',
            spy_insufficient:     'Risorse insufficienti per spionaggio (costo: 30💰 + 2🥇)',

            /* ── Colonies ── */
            col_no_colonies:      'Non hai ancora conquistato nessun territorio.',
            col_suppress:         '🛡️ Seda',
            col_suppress_all:     '🛡️ Seda Tutte',
            col_colonies:         'colonie',
            col_unstable:         'instabili',
            col_critical:         'critiche',
            col_suppress_revolts: 'SEDA TUTTE LE RIVOLTE',
            col_total_cost:       'Costo totale',
            col_garrison:         'Guarnigione',
            col_none:             'Nessuna',
            col_stable:           '✅ Stabile',
            col_status_critical:  '🔴 CRITICO',
            col_status_high:      '🟠 Alto',
            col_status_warning:   '🟡 Attenzione',
            col_status_low:       '🟢 Basso',
            col_per_turn:         '/turno',

            /* ── Revolt alert ── */
            revolt_warning:       'I seguenti territori conquistati mostrano segni di <strong>instabilità</strong>.',
            revolt_threshold:     'Se il malcontento raggiunge il 100%, scoppierà una rivolta!',
            revolt_suppress_all:  'SEDA TUTTE LE RIVOLTE',
            revolt_continue:      'PROSEGUI TURNO',

            /* ── Peace negotiation ── */
            peace_war_duration:   '⏱️ Durata guerra',
            peace_power_ratio:    '⚔️ Rapporto forze',
            peace_aggressor:      '🏳️ Aggressore',
            peace_weariness:      '😤 Stanchezza',
            peace_demands:        'chiede:',
            peace_you_have:       'hai',
            peace_insufficient:   'Non hai abbastanza risorse per soddisfare tutte le richieste!',
            peace_accept:         '✅ Accetta e firma la pace',
            peace_reject:         '❌ Rifiuta — continua la guerra',
            peace_enemy_stronger: '🔴 Nemico più forte',
            peace_you_stronger:   '🟢 Tu sei più forte',
            peace_balanced:       '🟡 Equilibrato',
            peace_you_aggressor:  'Tu (penalità)',
            peace_flavour_generous: 'è disposta a condizioni vantaggiose. La guerra li ha indeboliti.',
            peace_flavour_fair:     'Le condizioni riflettono un equilibrio di potere. Un accordo ragionevole.',
            peace_flavour_harsh:    'si sente in posizione di forza e pretende un prezzo alto.',
            peace_flavour_punitive: 'vuole umiliarti. Queste condizioni sono quasi un\'estorsione.',

            /* ── Toast messages ── */
            toast_sanctions:       'SANZIONI IMPOSTE',
            toast_sanctions_sub:   'produzione e commercio penalizzati',
            toast_embargo:         'EMBARGO COMMERCIALE',
            toast_embargo_sub:     'perde 💰20 e 🛢️10 immediatamente',
            toast_ally_done:       'ALLEANZA STIPULATA',
            toast_ally_sub:        'è ora un alleato',
            toast_ally_fail:       'ALLEANZA FALLITA',
            toast_ally_refused:    'ALLEANZA RIFIUTATA',
            toast_ally_no_res:     'Risorse insufficienti',
            toast_ally_no_accept:  'non accetta',
            toast_war:             'GUERRA DICHIARATA',
            toast_war_sub:         'ora siete in conflitto aperto!',
            toast_break_ally:      'ALLEANZA ROTTA',
            toast_break_ally_sub:  'non è più un alleato',
            toast_pact:            'PATTO DI NON AGGRESSIONE',
            toast_pact_sub:        'relazione +15',
            toast_pact_fail:       'PATTO FALLITO',
            toast_tribute_ok:      'TRIBUTO RICEVUTO',
            toast_tribute_pay:     'paga',
            toast_tribute_rel:     'relazione',
            toast_tribute_fail:    'TRIBUTO RIFIUTATO',
            toast_tribute_refuse:  'rifiuta',
            toast_peace_done:      'PACE FIRMATA',
            toast_peace_cost:      'costo',
            toast_peace_fail:      'PACE IMPOSSIBILE',
            toast_peace_no_res:    'Risorse insufficienti per le condizioni richieste',
            toast_peace_rejected:  'PACE RIFIUTATA',
            toast_peace_war_on:    'la guerra continua!',

            /* ── Event log messages ── */
            evt_sanctions:         'Sanzioni su',
            evt_embargo:           'Embargo su',
            evt_ally:              'Alleanza con',
            evt_war:               'Guerra dichiarata a',
            evt_break_ally:        'Alleanza rotta con',
            evt_pact:              'Patto con',
            evt_tribute_pay:       'paga {n} fondi',
            evt_tribute_refuse:    'rifiuta tributo',
            evt_trade_with:        'Scambio con',
            evt_trade_refused:     'rifiuta scambio',
            evt_peace_with:        'Pace con',
            evt_peace_rejected:    'Pace rifiutata con',
            evt_peace_war_on:      'La guerra continua!',
            evt_spy_intel:         'Intel ottenuta su',
            evt_spy_captured:      'Spia catturata in',
            evt_ai_turn:           'TURNO AI',
            evt_cannot_attack:     'Non puoi attaccare questo territorio',
            evt_attack_impossible: 'Attacco impossibile',
            evt_nuke_impossible:   'Attacco nucleare impossibile',
            evt_already_at_war:    'Siete già in guerra!',
            evt_revolt:            'RIVOLTA!',
            evt_revolt_rebel:      'si ribella — guarnigione troppo debole!',
            evt_all_revolts_done:  'Tutte le rivolte sono state sedate!',

            /* ── Autoplay ── */
            auto_spectator:       '👁️ MODALITÀ SPETTATORE',
            auto_watching:        'Stai osservando',
            auto_pause:           '⏸ PAUSA',
            auto_resume:          '▶ RIPRENDI',
            auto_stop:            '⏹ STOP',
            auto_return:          '⏹ TORNA A GIOCARE',
            auto_eliminated:      'ELIMINATO',
            auto_spectator_mode:  'Modalità spettatore',
            auto_year:            'Anno',

            /* ── Economy popup ── */
            econ_total_res:       'Risorse totali',
            econ_terr_count:      'Territori',
            econ_sanctions_on:    'Sanzioni attive',
            econ_reserves:        '💰 RISERVE ATTUALI',
            econ_per_turn:        '📈 ENTRATE PER TURNO',
            econ_per_turn_desc:   'Dai tuoi {n} territori. Territori conquistati producono il 70% delle risorse originali.',
            econ_sanctions_title: '⚠️ SANZIONI SUBITE',
            econ_sanctions_desc:  '{n} nazioni ti sanzionano (-{p}% produzione)',
            econ_assets_title:    '⚓ ASSET STRATEGICI',
            econ_no_assets:       'Nessun asset controllato',
            econ_army_title:      '🪖 FORZE ARMATE',
            econ_total_power:     'Potenza Totale',
            econ_techs_title:     '🔬 TECNOLOGIE RICERCATE',
            econ_no_techs:        'Nessuna tecnologia ricercata',

            /* ── Settings popup ── */
            settings_title:       '⚙️ IMPOSTAZIONI',
            settings_language:    'Lingua',
            settings_lang_it:     '<img class="lang-flag" src="assets/emoji/1f1ee-1f1f9.svg" alt="IT"> Italiano',
            settings_lang_en:     '<img class="lang-flag" src="assets/emoji/1f1ec-1f1e7.svg" alt="GB"> English',

            /* ── Resources (data labels) ── */
            res_money:     'Fondi',
            res_oil:       'Petrolio',
            res_gas:       'Gas',
            res_rareEarth: 'Terre Rare',
            res_gold:      'Oro',
            res_silver:    'Argento',
            res_diamonds:  'Diamanti',
            res_uranium:   'Uranio',
            res_steel:     'Acciaio',
            res_food:      'Cibo',

            /* ── Units (data labels) ── */
            unit_infantry:         'Fanteria',
            unit_tank:             'Corazzati',
            unit_artillery:        'Artiglieria',
            unit_fighter:          'Caccia',
            unit_bomber:           'Bombardiere',
            unit_drone:            'Drone',
            unit_navy:             'Flotta Navale',
            unit_submarine:        'Sottomarino',
            unit_cruiseMissile:    'Missile Crociera',
            unit_ballisticMissile: 'Missile Balistico',
            unit_sam:              'Sistema SAM',
            unit_nuke:             'Testata Nucleare',

            /* ── Technologies (data labels) ── */
            tech_advanced_drones:  'Droni Avanzati',
            tech_stealth_tech:     'Stealth',
            tech_hypersonic:       'Missili Ipersonici',
            tech_cyberwarfare:     'Cyberwarfare',
            tech_missile_defense:  'Difesa Antimissile',
            tech_nuclear_program:  'Programma Nucleare',
            tech_carrier_fleet:    'Portaerei',
            tech_space_recon:      'Ricognizione Spaz.',
            tech_ai_warfare:       'AI Militare',
            tech_green_energy:     'Energia Verde',
            tech_deep_mining:      'Miniere Profonde',
            tech_bio_defense:      'Difesa Biologica',

            /* ── Strategic Assets ── */
            asset_hormuz:        'Stretto di Hormuz',
            asset_panama:        'Canale di Panama',
            asset_suez:          'Canale di Suez',
            asset_malacca:       'Stretto di Malacca',
            asset_bosphorus:     'Bosforo',
            asset_gibraltar:     'Stretto di Gibilterra',
            asset_babelmandeb:   'Bab el-Mandeb',
            asset_capegood:      'Capo di Buona Speranza',
            asset_taiwan_strait: 'Stretto di Taiwan',
            asset_arctic_route:  'Rotta Artica',

            /* ── Misc ── */
            turns_word:           'turni',
            relation_word:        'relazione',
            cost_word:            'Costo',
            insufficient_res:     'Risorse insufficienti',
            your_turn:            '🎯 È il tuo turno!',
        },

        /* ═══════════ ENGLISH ═══════════ */
        en: {
            /* ── Intro screen ── */
            intro_subtitle:       'GLOBAL STRATEGIC WARFARE',
            intro_disclaimer:     'Game simulation — does not represent real operational instructions.',
            intro_play:           '🎮 PLAY',
            intro_howto:          '📖 HOW TO PLAY',

            /* ── Nation select ── */
            select_title:         'CHOOSE YOUR NATION',
            select_subtitle:      'Select a nation to begin the global conquest',
            select_back:          '← Back',
            select_start:         '🚀 START',
            preview_resources:    'Starting resources',
            preview_army:         'Army',
            preview_techs:        'Technologies',
            preview_power:        'Power',
            preview_territories:  'Territories',
            preview_neighbors:    'Borders with',
            preview_assets:       'Strategic assets',
            preview_profile:      'Profile',

            /* ── Tutorial ── */
            tutorial_title:       '📖 HOW TO PLAY',
            tut_step1_title:      '1. Choose Your Nation',
            tut_step1:            '50 playable nations, each with 10 resources: funds, oil, gas, rare earths, gold, silver, diamonds, uranium, steel and food. Control strategic assets (Hormuz, Panama, Suez, Malacca…) for production bonuses each turn.',
            tut_step2_title:      '2. Economy & Production',
            tut_step2:            'Resources accumulate each turn based on controlled territories. Occupied territories produce only 70%. Invest in 12 technologies (drones, stealth, hypersonic missiles, nuclear, cyberwarfare…) and build 12 unit types: infantry, armor, artillery, fighters, bombers, drones, navy, submarines, cruise missiles, ballistic missiles, SAM systems and nuclear warheads.',
            tut_step3_title:      '3. Combat & Intelligence',
            tut_step3:            'Attack enemy nations: each unit has ATK, DEF, speed, range and cost. Combat is probabilistic with defensive bonuses for great powers. You can also send spies (🕵️) to discover enemy resources and forces, or impose economic sanctions (−5% production per sanction).',
            tut_step4_title:      '4. Diplomacy & Colonies',
            tut_step4:            'Forge alliances, declare wars, impose embargoes, negotiate pacts and trade resources. Conquered territories become colonies: they produce less, suffer growing unrest and can revolt if unrest reaches 100%. Suppress revolts with troops!',
            tut_step5_title:      '5. Artificial Intelligence',
            tut_step5:            'AI nations have diverse personalities (superpower, defensive, opportunist, unstable…). They defend themselves, form alliances, research technologies and counter-attack. You can also enable autoplay and let the AI play for you.',
            tut_step6_title:      '6. Victory Conditions',
            tut_step6:            '<strong>Military Victory:</strong> conquer 85% of territories. <strong>Economic Victory:</strong> accumulate 50,000 funds while controlling at least 30% of the map. <strong>Strategic Victory:</strong> control all global strategic assets. Watch your economy: without resources, everything collapses.',

            /* ── HUD ── */
            hud_turn:             'Turn',
            hud_end_turn:         '⏭️ TURN',
            hud_end_turn_title:   'End Turn',
            hud_autoplay_title:   'Auto-play: the AI plays for you',
            hud_economy_title:    'Economic Overview',
            hud_production_title: 'Build Units',
            hud_tech_title:       'Research Technology',
            hud_diplomacy_title:  'Diplomacy',
            hud_colonies_title:   'Colony Management',
            hud_settings_title:   'Settings',

            /* ── Right panel ── */
            events_title:         '📋 EVENTS',
            events_fullscreen:    'Fullscreen',
            events_show:          'Show events',
            btn_live:             '🔴 LIVE',

            /* ── Popup titles ── */
            battle_title:         '⚔️ BATTLE',
            tech_title:           '🔬 TECH TREE',
            diplomacy_title:      '🤝 DIPLOMACY',
            production_title:     '🏭 BUILD UNITS',
            economy_title:        '📊 ECONOMIC OVERVIEW',
            trade_title:          '💱 TRADE RESOURCES',
            trade_desc:           'Trade resources with',
            trade_refused:        'refused',
            peace_title:          '🕊️ PEACE NEGOTIATION',
            spy_title:            '🕵️ INTELLIGENCE',
            colonies_title:       '🏛️ COLONY MANAGEMENT',
            revolt_title:         '🔥 REVOLT ALERT',

            /* ── Buttons ── */
            btn_close:            'CLOSE',
            btn_restart:          '🔄 RESTART',
            btn_view_map:         '🗺️ VIEW MAP',
            btn_attack:           '⚔️ Attack',
            btn_propose_peace:    '🕊️ Propose peace',
            btn_ally:             '🤝 Ally',
            btn_annex:            '🏳️ Annex',

            /* ── Side panel (territory) ── */
            panel_owner:          'Owner',
            panel_relation:       'Relation',
            panel_garrison:       'Garrison',
            panel_unrest:         'Unrest',
            panel_your_territory: '🏠 Your territory',
            panel_allied:         '🤝 Allied',
            panel_at_war:         '⚔️ At war',
            panel_wait_turn:      'Wait for your turn…',
            panel_resources:      'Resources',
            panel_production:     'Production',
            panel_strategic:      'Strategic assets',
            panel_military_actions: 'Military Actions',
            panel_diplomacy:      'Diplomacy',
            panel_economy:        'Economy',
            panel_territory_ctrl: 'Territory Control',
            panel_suppress:       '🛡️ Suppress Revolt',
            panel_quick_attack:   '⚔️ Quick Attack',
            panel_nuke_strike:    '☢️ Nuclear Strike',

            /* ── Nation detail / territory panel ── */
            nd_conquered:         '⚔ Conquered ({n})',
            nd_garrison_title:    'Garrison',
            nd_resources_title:   '💰 RESOURCES',
            nd_intel_unavailable: 'Intel unavailable',
            nd_military_title:    '🪖 MILITARY FORCES',
            nd_army_title:        '🪖 ARMY',
            nd_no_units:          'No units',
            nd_total:             '⚔️ Total',
            nd_atk_power:         '⚔️ Attack Power',
            nd_def_power:         '🛡️ Defence Power',
            nd_garrison:          '🏰 GARRISON',
            nd_units:             'units',
            nd_defense:           '🛡️ Defence',
            nd_unrest_label:      '🔥 Unrest',
            nd_dominant:          'Dominant',
            nd_homeland:          '🏠 Homeland',
            nd_front:             '⚔️ Front',
            nd_rear:              '🌍 Rear',
            nd_unrest_discontent: '🔥 Unrest',
            nd_unrest_critical:   'CRITICAL',
            nd_unrest_high:       'HIGH',
            nd_unrest_medium:     'MEDIUM',
            nd_unrest_low:        'LOW',
            nd_revolt_warning:    '⚠ Revolt at 100% — reinforce the garrison!',
            nd_no_garrison:       'No garrison',
            nd_no_garrison_desc:  'Unrest +5/turn · Defence −10%',
            nd_reachability:      '📡 REACHABILITY',
            nd_unreachable:       '🚫 Unreachable',

            /* ── Mid-turn revolt alert ── */
            revolt_mid_one:       'A TERRITORY HAS REVOLTED!',
            revolt_mid_many:      '{n} TERRITORIES HAVE REVOLTED!',
            revolt_mid_desc:      'Your troops are spread too thin — garrisons cannot hold control. Each conquest weakens the defences of existing colonies!',
            revolt_mid_lost:      'LOST',
            revolt_mid_yielded:   '🏳️ Yielded',
            revolt_mid_collapse:  '💀 Collapse',
            revolt_mid_retreat:   '🛡️ Retreat!',

            /* ── Trade ── */
            trade_refused_label:  '🚫 refused',
            trade_refused_msg:    '{name} refuses the trade! (no retry this turn)',

            /* ── AI event-log verbs ── */
            evt_ai_declares_war:  'declares war on',
            evt_ai_alliance:      'alliance with',
            evt_ai_peace:         'peace with',
            evt_ai_nuke:          'nuclear strike on',
            evt_ai_sanction:      'sanctions',
            evt_ai_research:      'researches',
            evt_ai_betray:        'betrays',
            evt_ai_revolt:        'REVOLT!',
            evt_ai_revolt_taken:  'Territory torn from',
            evt_ai_suppress:      'suppresses revolt in',
            evt_ai_eliminated:    'has been eliminated!',
            evt_ai_cedes:         'cedes {n} colonies:',
            evt_ai_survives:      'survives! Retreats to',
            evt_ai_collapse:      'TOTAL COLLAPSE!',
            evt_ai_conquers_all:  'conquers all',
            evt_ai_win:           'VICTORY',
            evt_ai_lose:          'DEFEAT',

            /* ── Tooltips / preview / summary ── */
            tt_units:             'units',
            tt_no_garrison:       '⚠ NO GARRISON',
            preview_power:        'Power',
            preview_funds:        '💰 Funds',
            preview_oil:          '🛢️ Oil',
            preview_steel:        '🔩 Steel',
            preview_army:         '🪖 Army',
            preview_profile:      'Profile',
            diplo_summary:        '🌍{terr} territories | ⚔️{atk} power | 🤝{allies} allies | 🔥{wars} wars',
            suppress_partial:     '⚠️ Suppressed {done} revolts, insufficient resources for remaining {left}',

            /* ── War fatigue ── */
            fatigue_title:        '⚡ WAR FATIGUE ({n}th attack)',
            fatigue_desc:         'Your troops are exhausted. Next attack:',
            fatigue_penalty:      'Power penalty',

            /* ── Reachability alert ── */
            reach_impossible:     '🚫 ATTACK IMPOSSIBLE',
            reach_target:         'Target',
            reach_tip_title:      '💡 Tip:',
            reach_tip_body:       'Build naval units (🚢 Fleet, 🐟 Submarine) for sea transport, or air units (✈️ Fighter, 🛩️ Bomber, 🤖 Drone) and missiles (🚀) for long-range strikes.',

            /* ── Trade success ── */
            trade_success:        'Trade successful!',
            per_turn_label:       '/turn',
            ai_turn_label:        '🤖 AI TURN — T{n}',
            player_eliminated:    '💀 {flag} {name} HAS BEEN ELIMINATED! Spectator mode active.',

            /* ── Badges & tooltips ── */
            badge_your_territory: '👑 YOUR TERRITORY',
            badge_your_nation:    '👑 YOUR NATION',
            badge_at_war:         '⚔️ AT WAR',
            badge_allied:         '🤝 ALLIED',
            badge_eliminated:     '💀 ELIMINATED',
            badge_enemy:          '⚔️ ENEMY',
            badge_relation:       'Relation',
            tt_tap_details:       '👆 Tap for details',
            nd_territories:       '🌍 TERRITORIES ({n})',
            nd_no_territories:    'No territories',
            nl_title:             '🗺️ NATIONS',

            /* ── Animation labels ── */
            anim_conquered:       'CONQUERED!',
            anim_repelled:        'REPELLED',
            anim_attacks:         'ATTACKS',
            anim_nuke_strike:     'NUCLEAR STRIKE!',
            anim_revolt:          '🔥 REVOLT!',

            /* ── Diplomacy actions ── */
            diplo_declare_war:    '⚔️ Declare War',
            diplo_ally:           '🤝 Propose Alliance',
            diplo_break_ally:     '💔 Break Alliance',
            diplo_non_aggression: '📝 Non-Aggression Pact',
            diplo_trade:          '💱 Trade Resources',
            diplo_sanction:       '🚫 Impose Sanctions',
            diplo_embargo:        '⛔ Trade Embargo',
            diplo_tribute:        '💰 Demand Tribute',
            diplo_spy:            '🕵️ Espionage',
            diplo_peace:          '🕊️ Propose Peace',
            diplo_section_war:    'AT WAR',
            diplo_section_allies: 'ALLIES',
            diplo_section_others: 'OTHER NATIONS',

            /* ── Production ── */
            prod_current_army:    '🪖 CURRENT ARMY',
            prod_power:           'Power',
            prod_build:           '🏭 BUILD',
            prod_requires:        '🔒 Requires',
            prod_consumable:      '⚡ Consumable',
            prod_nuclear:         '☢️ Nuclear',
            prod_range:           'Range',

            /* ── Tech ── */
            tech_researched:      '✅ Researched',
            tech_available:       'Available',
            tech_locked:          '🔒 Locked',
            tech_requires:        'Requires',
            tech_research:        'RESEARCH',
            tech_tier_base:       'Base',
            tech_tier_adv:        'Advanced',
            tech_tier_elite:      'Élite',

            /* ── Battle result ── */
            btl_victory:          '✅ VICTORY',
            btl_victory_conq:     '✅ VICTORY — Territory conquered!',
            btl_defeat:           '❌ DEFEAT — Retreat!',
            btl_loot:             '📦 War loot',
            btl_attack_cost:      'attack',
            btl_fatigue:          'Fatigue',

            /* ── Game over ── */
            go_you_won:           '🏆 YOU WON!',
            go_you_lost:          '💀 YOU LOST!',
            go_won:               'HAS WON!',
            go_dominates:         'dominates the world!',
            go_conquered:         'has achieved global domination.',
            go_conquered_turn:    'has achieved global domination at turn',
            go_winner:            'Winner',
            go_turns:             'Turns',
            go_territories:       'Territories',
            go_funds:             'Funds',
            go_victory_type:      'Victory Type',
            vic_military:         'MILITARY VICTORY',
            vic_military_desc:    'Territorial domination (≥85% territories)',
            vic_economic:         'ECONOMIC VICTORY',
            vic_economic_desc:    'Economic supremacy (≥50K funds + ≥30% territories)',
            vic_strategic:        'STRATEGIC VICTORY',
            vic_strategic_desc:   'Control of all strategic assets',

            /* ── Spy ── */
            spy_success:          '🕵️ MISSION SUCCESS',
            spy_failure:          '🕵️ MISSION FAILED',
            spy_captured:         'Agent captured!',
            spy_intercepted:      'Your spy was intercepted in',
            spy_relations_down:   '📉 Relations deteriorated',
            spy_resources:        '📦 Resources',
            spy_army:             '🪖 Army',
            spy_techs:            '🔬 Technologies',
            spy_diplomacy:        '🌐 Diplomacy',
            spy_allies:           '🤝 Allies',
            spy_at_war_with:      '⚔️ At war with',
            spy_no_resource:      'No significant resources',
            spy_no_units:         'No units',
            spy_cost:             'Espionage (30💰 + 2🥇)',
            spy_insufficient:     'Insufficient resources for espionage (cost: 30💰 + 2🥇)',

            /* ── Colonies ── */
            col_no_colonies:      'You haven\'t conquered any territory yet.',
            col_suppress:         '🛡️ Suppress',
            col_suppress_all:     '🛡️ Suppress All',
            col_colonies:         'colonies',
            col_unstable:         'unstable',
            col_critical:         'critical',
            col_suppress_revolts: 'SUPPRESS ALL REVOLTS',
            col_total_cost:       'Total cost',
            col_garrison:         'Garrison',
            col_none:             'None',
            col_stable:           '✅ Stable',
            col_status_critical:  '🔴 CRITICAL',
            col_status_high:      '🟠 High',
            col_status_warning:   '🟡 Warning',
            col_status_low:       '🟢 Low',
            col_per_turn:         '/turn',

            /* ── Revolt alert ── */
            revolt_warning:       'The following conquered territories show signs of <strong>instability</strong>.',
            revolt_threshold:     'If unrest reaches 100%, a revolt will break out!',
            revolt_suppress_all:  'SUPPRESS ALL REVOLTS',
            revolt_continue:      'CONTINUE TURN',

            /* ── Peace negotiation ── */
            peace_war_duration:   '⏱️ War duration',
            peace_power_ratio:    '⚔️ Power ratio',
            peace_aggressor:      '🏳️ Aggressor',
            peace_weariness:      '😤 Weariness',
            peace_demands:        'demands:',
            peace_you_have:       'you have',
            peace_insufficient:   'Not enough resources to meet all demands!',
            peace_accept:         '✅ Accept and sign peace',
            peace_reject:         '❌ Reject — continue the war',
            peace_enemy_stronger: '🔴 Enemy stronger',
            peace_you_stronger:   '🟢 You are stronger',
            peace_balanced:       '🟡 Balanced',
            peace_you_aggressor:  'You (penalty)',
            peace_flavour_generous: 'is willing to offer favourable terms. The war has weakened them.',
            peace_flavour_fair:     'The terms reflect a balance of power. A reasonable deal.',
            peace_flavour_harsh:    'feels in a position of strength and demands a high price.',
            peace_flavour_punitive: 'wants to humiliate you. These terms are almost extortion.',

            /* ── Toast messages ── */
            toast_sanctions:       'SANCTIONS IMPOSED',
            toast_sanctions_sub:   'production and trade penalised',
            toast_embargo:         'TRADE EMBARGO',
            toast_embargo_sub:     'loses 💰20 and 🛢️10 immediately',
            toast_ally_done:       'ALLIANCE FORMED',
            toast_ally_sub:        'is now an ally',
            toast_ally_fail:       'ALLIANCE FAILED',
            toast_ally_refused:    'ALLIANCE REFUSED',
            toast_ally_no_res:     'Insufficient resources',
            toast_ally_no_accept:  'declines',
            toast_war:             'WAR DECLARED',
            toast_war_sub:         'you are now in open conflict!',
            toast_break_ally:      'ALLIANCE BROKEN',
            toast_break_ally_sub:  'is no longer an ally',
            toast_pact:            'NON-AGGRESSION PACT',
            toast_pact_sub:        'relation +15',
            toast_pact_fail:       'PACT FAILED',
            toast_tribute_ok:      'TRIBUTE RECEIVED',
            toast_tribute_pay:     'pays',
            toast_tribute_rel:     'relation',
            toast_tribute_fail:    'TRIBUTE REFUSED',
            toast_tribute_refuse:  'refuses',
            toast_peace_done:      'PEACE SIGNED',
            toast_peace_cost:      'cost',
            toast_peace_fail:      'PEACE IMPOSSIBLE',
            toast_peace_no_res:    'Insufficient resources for the demanded terms',
            toast_peace_rejected:  'PEACE REJECTED',
            toast_peace_war_on:    'the war continues!',

            /* ── Event log messages ── */
            evt_sanctions:         'Sanctions on',
            evt_embargo:           'Embargo on',
            evt_ally:              'Alliance with',
            evt_war:               'War declared on',
            evt_break_ally:        'Alliance broken with',
            evt_pact:              'Pact with',
            evt_tribute_pay:       'pays {n} funds',
            evt_tribute_refuse:    'refuses tribute',
            evt_trade_with:        'Trade with',
            evt_trade_refused:     'refuses trade',
            evt_peace_with:        'Peace with',
            evt_peace_rejected:    'Peace rejected with',
            evt_peace_war_on:      'The war continues!',
            evt_spy_intel:         'Intel obtained on',
            evt_spy_captured:      'Spy captured in',
            evt_ai_turn:           'AI TURN',
            evt_cannot_attack:     'Cannot attack this territory',
            evt_attack_impossible: 'Attack impossible',
            evt_nuke_impossible:   'Nuclear strike impossible',
            evt_already_at_war:    'Already at war!',
            evt_revolt:            'REVOLT!',
            evt_revolt_rebel:      'rebels — garrison too weak!',
            evt_all_revolts_done:  'All revolts have been suppressed!',

            /* ── Autoplay ── */
            auto_spectator:       '👁️ SPECTATOR MODE',
            auto_watching:        'Watching',
            auto_pause:           '⏸ PAUSE',
            auto_resume:          '▶ RESUME',
            auto_stop:            '⏹ STOP',
            auto_return:          '⏹ RETURN TO PLAY',
            auto_eliminated:      'ELIMINATED',
            auto_spectator_mode:  'Spectator mode',
            auto_year:            'Year',

            /* ── Economy popup ── */
            econ_total_res:       'Total resources',
            econ_terr_count:      'Territories',
            econ_sanctions_on:    'Active sanctions',
            econ_reserves:        '💰 CURRENT RESERVES',
            econ_per_turn:        '📈 INCOME PER TURN',
            econ_per_turn_desc:   'From your {n} territories. Conquered territories produce only 70% of original resources.',
            econ_sanctions_title: '⚠️ SANCTIONS IMPOSED',
            econ_sanctions_desc:  '{n} nations are sanctioning you (-{p}% production)',
            econ_assets_title:    '⚓ STRATEGIC ASSETS',
            econ_no_assets:       'No assets controlled',
            econ_army_title:      '🪖 ARMED FORCES',
            econ_total_power:     'Total Power',
            econ_techs_title:     '🔬 RESEARCHED TECHNOLOGIES',
            econ_no_techs:        'No technologies researched',

            /* ── Settings popup ── */
            settings_title:       '⚙️ SETTINGS',
            settings_language:    'Language',
            settings_lang_it:     '<img class="lang-flag" src="assets/emoji/1f1ee-1f1f9.svg" alt="IT"> Italiano',
            settings_lang_en:     '<img class="lang-flag" src="assets/emoji/1f1ec-1f1e7.svg" alt="GB"> English',

            /* ── Resources (data labels) ── */
            res_money:     'Funds',
            res_oil:       'Oil',
            res_gas:       'Gas',
            res_rareEarth: 'Rare Earths',
            res_gold:      'Gold',
            res_silver:    'Silver',
            res_diamonds:  'Diamonds',
            res_uranium:   'Uranium',
            res_steel:     'Steel',
            res_food:      'Food',

            /* ── Units (data labels) ── */
            unit_infantry:         'Infantry',
            unit_tank:             'Armor',
            unit_artillery:        'Artillery',
            unit_fighter:          'Fighter',
            unit_bomber:           'Bomber',
            unit_drone:            'Drone',
            unit_navy:             'Navy',
            unit_submarine:        'Submarine',
            unit_cruiseMissile:    'Cruise Missile',
            unit_ballisticMissile: 'Ballistic Missile',
            unit_sam:              'SAM System',
            unit_nuke:             'Nuclear Warhead',

            /* ── Technologies (data labels) ── */
            tech_advanced_drones:  'Advanced Drones',
            tech_stealth_tech:     'Stealth',
            tech_hypersonic:       'Hypersonic Missiles',
            tech_cyberwarfare:     'Cyberwarfare',
            tech_missile_defense:  'Missile Defense',
            tech_nuclear_program:  'Nuclear Program',
            tech_carrier_fleet:    'Aircraft Carrier',
            tech_space_recon:      'Space Recon',
            tech_ai_warfare:       'AI Warfare',
            tech_green_energy:     'Green Energy',
            tech_deep_mining:      'Deep Mining',
            tech_bio_defense:      'Bio Defense',

            /* ── Strategic Assets ── */
            asset_hormuz:        'Strait of Hormuz',
            asset_panama:        'Panama Canal',
            asset_suez:          'Suez Canal',
            asset_malacca:       'Strait of Malacca',
            asset_bosphorus:     'Bosphorus',
            asset_gibraltar:     'Strait of Gibraltar',
            asset_babelmandeb:   'Bab el-Mandeb',
            asset_capegood:      'Cape of Good Hope',
            asset_taiwan_strait: 'Taiwan Strait',
            asset_arctic_route:  'Arctic Route',

            /* ── Misc ── */
            turns_word:           'turns',
            relation_word:        'relation',
            cost_word:            'Cost',
            insufficient_res:     'Insufficient resources',
            your_turn:            '🎯 It\'s your turn!',
        }
    };

    /* ═══════════════ API ═══════════════ */

    /**
     * Translate a key. Supports simple parameter replacement:
     *   t('evt_tribute_pay', { n: 42 }) → "paga 42 fondi"
     */
    function t(key, params) {
        const d = _dict[_lang] || _dict.it;
        let s = d[key];
        if (s === undefined) {
            /* Fallback to Italian, then return the key itself */
            s = _dict.it[key];
            if (s === undefined) return key;
        }
        if (params) {
            Object.keys(params).forEach(k => {
                s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return s;
    }

    /** Get a localised name for a resource key */
    function res(key) { return t('res_' + key); }

    /** Get a localised name for a unit type key */
    function unit(key) { return t('unit_' + key); }

    /** Get a localised name for a technology id */
    function tech(id) { return t('tech_' + id); }

    /** Get a localised name for a strategic asset id */
    function asset(id) { return t('asset_' + id); }

    /**
     * Apply translations to all HTML elements with `data-i18n` attribute.
     * Supports:
     *   data-i18n="key"               → sets textContent
     *   data-i18n-html="key"          → sets innerHTML
     *   data-i18n-title="key"         → sets title attribute
     *   data-i18n-placeholder="key"   → sets placeholder attribute
     */
    function applyI18n(root) {
        root = root || document;

        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        root.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (key) el.innerHTML = t(key);
        });
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = t(key);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key);
        });
    }

    /** Update data.js RESOURCES / UNIT_TYPES / TECHNOLOGIES / STRATEGIC_ASSETS names */
    function _patchDataLabels() {
        if (typeof RESOURCES !== 'undefined') {
            Object.keys(RESOURCES).forEach(k => {
                const label = t('res_' + k);
                if (label !== ('res_' + k)) RESOURCES[k].name = label;
            });
        }
        if (typeof UNIT_TYPES !== 'undefined') {
            Object.keys(UNIT_TYPES).forEach(k => {
                const label = t('unit_' + k);
                if (label !== ('unit_' + k)) UNIT_TYPES[k].name = label;
            });
        }
        if (typeof TECHNOLOGIES !== 'undefined') {
            TECHNOLOGIES.forEach(tech => {
                const label = t('tech_' + tech.id);
                if (label !== ('tech_' + tech.id)) tech.name = label;
            });
        }
        if (typeof STRATEGIC_ASSETS !== 'undefined') {
            Object.keys(STRATEGIC_ASSETS).forEach(k => {
                const label = t('asset_' + k);
                if (label !== ('asset_' + k)) STRATEGIC_ASSETS[k].name = label;
            });
        }
    }

    /* ═══════════════ SETTINGS / LOCALSTORAGE ═══════════════ */

    function _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                _settings = Object.assign({}, DEFAULTS, JSON.parse(raw));
            } else {
                _settings = Object.assign({}, DEFAULTS);
            }
        } catch (e) {
            _settings = Object.assign({}, DEFAULTS);
        }
        _lang = _settings.lang || 'it';
    }

    function _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings));
        } catch (e) { /* quota exceeded or private mode */ }
    }

    function getSetting(key) { return _settings[key]; }

    function setSetting(key, value) {
        _settings[key] = value;
        _save();
    }

    function getLang() { return _lang; }

    function setLang(lang) {
        if (lang !== 'it' && lang !== 'en') return;
        _lang = lang;
        _settings.lang = lang;
        _save();
        _patchDataLabels();
        applyI18n();
        /* Notify rest of the app */
        if (typeof EventBus !== 'undefined') {
            EventBus.emit('lang:changed', { lang });
        }
    }

    /* ═══════════════ INIT ═══════════════ */
    _load();
    _patchDataLabels();

    /* Auto-apply to HTML once DOM is ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyI18n());
    } else {
        /* DOM already ready — apply immediately */
        applyI18n();
    }

    /* ── Public API ── */
    return {
        t, res, unit, tech, asset,
        applyI18n,
        getLang, setLang,
        getSetting, setSetting,
        DEFAULTS
    };
})();
