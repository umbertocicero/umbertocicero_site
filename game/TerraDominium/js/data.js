/* ═══════════════════════════════════════════════════════
   GeoDominion — Game Data  (v2 — SVG Real Map)
   50 nazioni giocabili + ~180 stati minori
   ═══════════════════════════════════════════════════════ */

/* ── All SVG territory ids ── */
const SVG_IDS = [
    'ad','ae','af','ag','ai','al','am','an','ao','aq','ar','as','at','au','aw','az',
    'ba','bb','bd','be','bf','bg','bh','bi','bj','bm','bn','bo','br','bs','bt','bw','by','bz',
    'ca','cd','cf','cg','ch','ci','ck','cl','cm','cn','co','cr','cu','cv','cy','cz',
    'de','dj','dk','dm','do','dz','ec','ee','eg','eh','er','es','et',
    'fi','fj','fk','fm','fo','fr','ga','gb','gd','ge','gf','gg','gh','gi','gl','gm','gn','gp','gq','gr','gt','gu','gw','gy',
    'hn','hr','ht','hu','id','ie','il','im','in','iq','ir','is','it',
    'je','jm','jo','jp','ke','kg','kh','ki','km','kn','kp','kr','kw','ky','kz',
    'la','lb','lc','li','lk','lr','ls','lt','lu','lv','ly',
    'ma','mc','md','me','mg','mh','mk','ml','mm','mn','mp','mq','mr','ms','mt','mu','mv','mw','mx','my','mz',
    'na','nc','ne','ng','ni','nl','no','np','nr','nu','nz',
    'om','pa','pe','pf','pg','ph','pk','pl','pm','pn','pr','ps','pt','pw','py',
    'qa','re','ro','rs','ru','rw',
    'sa','sb','sc','sd','se','sg','sh','si','sk','sl','sm','sn','so','sr','ss','st','sv','sy','sz',
    'tc','td','tg','th','tj','tl','tm','tn','to','tr','tt','tv','tw','tz',
    'ua','ug','us','uy','uz','va','vc','ve','vg','vi','vn','vu','wf','ws','ye','yt','za','zm','zw'
];

const RESOURCES = {
    money:     { icon: '💰', name: 'Fondi',       color: '#ffd700' },
    oil:       { icon: '🛢️', name: 'Petrolio',    color: '#333' },
    gas:       { icon: '🔥', name: 'Gas',         color: '#ff6600' },
    rareEarth: { icon: '⚗️', name: 'Terre Rare',  color: '#9c27b0' },
    gold:      { icon: '🥇', name: 'Oro',         color: '#ffd700' },
    silver:    { icon: '🥈', name: 'Argento',     color: '#c0c0c0' },
    diamonds:  { icon: '💎', name: 'Diamanti',    color: '#00bcd4' },
    uranium:   { icon: '☢️', name: 'Uranio',      color: '#76ff03' },
    steel:     { icon: '🔩', name: 'Acciaio',     color: '#78909c' },
    food:      { icon: '🌾', name: 'Cibo',        color: '#8bc34a' }
};

const STRATEGIC_ASSETS = {
    hormuz:        { name:'Stretto di Hormuz',       icon:'⚓', bonus:{oil:30},                holders:['ir','om'] },
    panama:        { name:'Canale di Panama',         icon:'🚢', bonus:{money:50},              holders:['pa'] },
    suez:          { name:'Canale di Suez',           icon:'🚢', bonus:{money:40,oil:10},       holders:['eg'] },
    malacca:       { name:'Stretto di Malacca',       icon:'⚓', bonus:{money:35},              holders:['my','id'] },
    bosphorus:     { name:'Bosforo',                  icon:'⚓', bonus:{money:20},              holders:['tr'] },
    gibraltar:     { name:'Stretto di Gibilterra',    icon:'⚓', bonus:{money:15},              holders:['es','gb'] },
    babelmandeb:   { name:'Bab el-Mandeb',            icon:'⚓', bonus:{money:20,oil:5},        holders:['dj','ye'] },
    capegood:      { name:'Capo di Buona Speranza',   icon:'⚓', bonus:{money:15},              holders:['za'] },
    taiwan_strait: { name:'Stretto di Taiwan',        icon:'⚓', bonus:{rareEarth:10},          holders:['tw'] },
    arctic_route:  { name:'Rotta Artica',             icon:'❄️', bonus:{money:20,gas:10},       holders:['no','ru','ca'] }
};

const UNIT_TYPES = {
    infantry:        {icon:'🪖',name:'Fanteria',         atk:3,  def:4,  cost:{money:50},                               spd:1, rng:1},
    tank:            {icon:'🚜',name:'Corazzati',        atk:8,  def:6,  cost:{money:180,steel:10},                     spd:2, rng:1},
    artillery:       {icon:'💥',name:'Artiglieria',      atk:10, def:2,  cost:{money:200,steel:10},                     spd:1, rng:2},
    fighter:         {icon:'✈️',name:'Caccia',           atk:12, def:5,  cost:{money:350,steel:20,gold:3},              spd:5, rng:4},
    bomber:          {icon:'🛩️',name:'Bombardiere',      atk:18, def:3,  cost:{money:600,steel:30,gold:5},              spd:3, rng:5},
    drone:           {icon:'🤖',name:'Drone',            atk:7,  def:1,  cost:{money:120,rareEarth:3,silver:2},         spd:4, rng:3},
    navy:            {icon:'🚢',name:'Flotta Navale',    atk:14, def:10, cost:{money:500,steel:35,gold:3},              spd:3, rng:3},
    submarine:       {icon:'🐟',name:'Sottomarino',      atk:16, def:8,  cost:{money:450,steel:30,silver:3},            spd:2, rng:4},
    cruiseMissile:   {icon:'🚀',name:'Missile Crociera', atk:25, def:0,  cost:{money:300,steel:15,silver:2},            spd:8, rng:6, consumable:true},
    ballisticMissile:{icon:'☄️',name:'Missile Balistico',atk:40, def:0,  cost:{money:800,steel:20,uranium:2,gold:3},    spd:10,rng:10,consumable:true},
    sam:             {icon:'📡',name:'Sistema SAM',      atk:5,  def:20, cost:{money:250,steel:15},                     spd:0, rng:3},
    nuke:            {icon:'☢️',name:'Testata Nucleare', atk:200,def:0,  cost:{money:5000,uranium:50,diamonds:10},       spd:10,rng:15,consumable:true,nuke:true}
};

const TECHNOLOGIES = [
    {id:'advanced_drones',  icon:'🤖',name:'Droni Avanzati',      cost:{money:800,rareEarth:20},           effect:'drone_atk+5',          desc:'+5 ATK droni',              prereq:[],                              tip:'I tuoi droni diventano più letali in attacco.'},
    {id:'stealth_tech',     icon:'👻',name:'Stealth',             cost:{money:1200,rareEarth:30},          effect:'fighter_atk+8',         desc:'+8 ATK caccia',             prereq:['advanced_drones'],             tip:'I caccia colpiscono più forte grazie alla tecnologia stealth.'},
    {id:'hypersonic',       icon:'⚡',name:'Missili Ipersonici',  cost:{money:2000,steel:60,rareEarth:40}, effect:'cruiseMissile_atk+15',  desc:'+15 ATK missili',           prereq:['stealth_tech'],                tip:'Missili troppo veloci per essere intercettati.'},
    {id:'cyberwarfare',     icon:'💻',name:'Cyberwarfare',        cost:{money:600,rareEarth:15},           effect:'sabotage',              desc:'+20% successo spie',        prereq:[],                              tip:'Le missioni di spionaggio hanno l\'80% di successo invece del 60%.'},
    {id:'missile_defense',  icon:'📡',name:'Difesa Antimissile', cost:{money:1500,steel:40},              effect:'sam_def+15',            desc:'+15 DEF SAM',               prereq:[],                              tip:'Le batterie SAM difendono molto meglio dai missili.'},
    {id:'nuclear_program',  icon:'☢️',name:'Programma Nucleare', cost:{money:3000,uranium:30},            effect:'nuke_enabled',          desc:'Sblocca testate nucleari',  prereq:['missile_defense'],             tip:'Puoi costruire e lanciare armi nucleari devastanti.'},
    {id:'carrier_fleet',    icon:'🛳️',name:'Portaerei',          cost:{money:2500,steel:80},              effect:'navy_atk+10',           desc:'+10 ATK flotta',            prereq:[],                              tip:'La flotta navale diventa molto più potente in attacco.'},
    {id:'space_recon',      icon:'🛰️',name:'Ricognizione Spaz.', cost:{money:1800,rareEarth:25},          effect:'recon',                 desc:'Visione globale',           prereq:['advanced_drones'],             tip:'Vedi risorse ed eserciti di tutte le nazioni.'},
    {id:'ai_warfare',       icon:'🧠',name:'AI Militare',        cost:{money:2200,rareEarth:50},          effect:'all_atk+3',             desc:'+3 ATK tutte le unità',     prereq:['cyberwarfare','advanced_drones'], tip:'Ogni unità del tuo esercito attacca più forte.'},
    {id:'green_energy',     icon:'🌱',name:'Energia Verde',      cost:{money:1000},                       effect:'money_prod+20',         desc:'+20 produzione fondi',      prereq:[],                              tip:'Guadagni 20 fondi extra ogni turno.'},
    {id:'deep_mining',      icon:'⛏️',name:'Miniere Profonde',   cost:{money:800,steel:30},               effect:'mining+30%',            desc:'+30% risorse minerarie',    prereq:[],                              tip:'Acciaio, terre rare e uranio aumentano del 30%.'},
    {id:'bio_defense',      icon:'🧬',name:'Difesa Biologica',   cost:{money:900},                        effect:'def+5_all',             desc:'+5 DEF tutte le unità',     prereq:[],                              tip:'Ogni unità resiste meglio agli attacchi nemici.'}
];

/* AI personality archetypes */
const AI_PROFILES = {
    superpower:  {aggression:.65,expansion:.7,  diplomacy:.4, techFocus:.8, nukeTolerance:.3},
    regional:    {aggression:.55,expansion:.6,  diplomacy:.5, techFocus:.5, nukeTolerance:.15},
    defensive:   {aggression:.15,expansion:.15, diplomacy:.8, techFocus:.9, nukeTolerance:.05},
    opportunist: {aggression:.45,expansion:.55, diplomacy:.4, techFocus:.3, nukeTolerance:.1},
    neutral:     {aggression:.1, expansion:.1,  diplomacy:.9, techFocus:.6, nukeTolerance:.02},
    unstable:    {aggression:.7, expansion:.4,  diplomacy:.15,techFocus:.15,nukeTolerance:.5},
    minor:       {aggression:.2, expansion:.15, diplomacy:.5, techFocus:.2, nukeTolerance:.0}
};

/* ═══  50 playable nations  ═══ */
const NATIONS = {
    us:{name:'Stati Uniti',flag:'🇺🇸',color:'#1e88e5',profile:'superpower',
        res:{money:600,oil:80,gas:70,rareEarth:10,gold:15,silver:10,diamonds:0,uranium:20,steel:60,food:90},
        prod:{money:65,oil:12,gas:10,steel:8,food:12},
        army:{infantry:45,tank:22,fighter:18,bomber:8,drone:14,navy:16,submarine:10,sam:12,cruiseMissile:8,ballisticMissile:4},
        assets:['panama'],neighbors:['ca','mx','cu','gb','ru','jp','kr'],power:95},
    ru:{name:'Russia',flag:'🇷🇺',color:'#b71c1c',profile:'superpower',
        res:{money:300,oil:90,gas:100,rareEarth:15,gold:20,silver:5,diamonds:20,uranium:25,steel:50,food:50},
        prod:{money:35,oil:15,gas:18,steel:7,food:6},
        army:{infantry:55,tank:28,fighter:18,bomber:10,drone:8,navy:12,submarine:14,sam:18,cruiseMissile:12,ballisticMissile:8},
        assets:['arctic_route'],neighbors:['us','cn','ua','kz','fi','no','jp','tr','ge','pl','by','ee','lv','lt','mn','az'],power:90},
    cn:{name:'Cina',flag:'🇨🇳',color:'#ff1a1a',profile:'superpower',
        res:{money:500,oil:30,gas:20,rareEarth:80,gold:10,silver:5,diamonds:0,uranium:10,steel:80,food:70},
        prod:{money:60,oil:5,gas:3,rareEarth:15,steel:15,food:10},
        army:{infantry:60,tank:24,fighter:16,bomber:6,drone:18,navy:14,submarine:10,sam:14,cruiseMissile:10,ballisticMissile:6},
        assets:['taiwan_strait'],neighbors:['ru','in','jp','kr','kp','mn','kz','pk','mm','vn','la','np','bt','af','tj','kg'],power:92},
    in:{name:'India',flag:'🇮🇳',color:'#ff9100',profile:'regional',
        res:{money:250,oil:10,gas:10,rareEarth:20,gold:5,silver:3,diamonds:10,uranium:8,steel:40,food:80},
        prod:{money:30,oil:2,gas:2,rareEarth:4,steel:6,food:14},
        army:{infantry:40,tank:14,fighter:12,bomber:4,drone:8,navy:10,submarine:6,sam:8,cruiseMissile:5,ballisticMissile:3},
        neighbors:['cn','pk','bd','mm','lk','np'],power:75},
    gb:{name:'Regno Unito',flag:'🇬🇧',color:'#283593',profile:'defensive',
        res:{money:300,oil:20,gas:15,rareEarth:2,gold:3,silver:2,diamonds:0,uranium:3,steel:20,food:30},
        prod:{money:35,oil:3,gas:2,steel:3,food:4},
        army:{infantry:18,tank:8,fighter:10,bomber:4,drone:6,navy:12,submarine:8,sam:6,cruiseMissile:4},
        assets:['gibraltar'],neighbors:['fr','us','ie','no'],power:68},
    fr:{name:'Francia',flag:'🇫🇷',color:'#304ffe',profile:'regional',
        res:{money:280,oil:5,gas:5,rareEarth:3,gold:5,silver:2,diamonds:0,uranium:10,steel:25,food:45},
        prod:{money:32,oil:1,gas:1,uranium:2,steel:4,food:7},
        army:{infantry:20,tank:10,fighter:10,bomber:4,drone:6,navy:10,submarine:6,sam:6,cruiseMissile:4,ballisticMissile:2},
        neighbors:['gb','de','es','it','be','ch'],power:66},
    de:{name:'Germania',flag:'🇩🇪',color:'#546e7a',profile:'defensive',
        res:{money:350,oil:2,gas:5,rareEarth:1,gold:3,silver:2,diamonds:0,uranium:1,steel:40,food:40},
        prod:{money:40,steel:8,food:5},
        army:{infantry:16,tank:12,fighter:8,bomber:2,drone:5,navy:5,submarine:4,sam:8,cruiseMissile:2},
        neighbors:['fr','pl','nl','be','at','ch','cz','dk'],power:62},
    jp:{name:'Giappone',flag:'🇯🇵',color:'#ec407a',profile:'defensive',
        res:{money:380,oil:1,gas:2,rareEarth:5,gold:3,silver:5,diamonds:0,uranium:1,steel:30,food:25},
        prod:{money:42,steel:5,food:3},
        army:{infantry:14,tank:8,fighter:12,bomber:2,drone:10,navy:14,submarine:8,sam:12,cruiseMissile:3},
        neighbors:['cn','kr','ru','us'],power:62},
    br:{name:'Brasile',flag:'🇧🇷',color:'#43a047',profile:'regional',
        res:{money:200,oil:20,gas:5,rareEarth:15,gold:10,silver:3,diamonds:8,uranium:5,steel:30,food:70},
        prod:{money:22,oil:3,rareEarth:3,food:12},
        army:{infantry:25,tank:8,fighter:6,bomber:2,drone:4,navy:6,submarine:3,sam:4,cruiseMissile:1},
        neighbors:['ar','co','ve','pe','uy','py','bo','gy','sr','gf'],power:55},
    sa:{name:'Arabia Saudita',flag:'🇸🇦',color:'#00c853',profile:'regional',
        res:{money:400,oil:150,gas:50,rareEarth:2,gold:5,silver:3,diamonds:0,uranium:1,steel:10,food:10},
        prod:{money:45,oil:25,gas:8},
        army:{infantry:18,tank:10,fighter:12,bomber:4,drone:8,navy:5,submarine:2,sam:8,cruiseMissile:6,ballisticMissile:2},
        assets:['hormuz'],neighbors:['ir','iq','ae','ye','om','jo','kw','eg'],power:58},
    ir:{name:'Iran',flag:'🇮🇷',color:'#7b1fa2',profile:'regional',
        res:{money:150,oil:100,gas:80,rareEarth:5,gold:3,silver:2,diamonds:0,uranium:15,steel:20,food:25},
        prod:{money:18,oil:15,gas:12,uranium:3},
        army:{infantry:28,tank:12,fighter:8,bomber:2,drone:14,navy:5,submarine:4,sam:12,cruiseMissile:8,ballisticMissile:6},
        assets:['hormuz'],neighbors:['sa','iq','tr','pk','af','tm','az'],power:55},
    il:{name:'Israele',flag:'🇮🇱',color:'#5c6bc0',profile:'defensive',
        res:{money:200,oil:1,gas:10,rareEarth:2,gold:1,silver:1,diamonds:5,uranium:3,steel:8,food:15},
        prod:{money:28,gas:2,steel:2,food:2},
        army:{infantry:18,tank:10,fighter:14,bomber:4,drone:16,navy:5,submarine:3,sam:16,cruiseMissile:6},
        neighbors:['eg','jo','sy','lb','ps'],power:65},
    tr:{name:'Turchia',flag:'🇹🇷',color:'#ef6c00',profile:'regional',
        res:{money:180,oil:5,gas:3,rareEarth:8,gold:8,silver:5,diamonds:0,uranium:3,steel:25,food:35},
        prod:{money:22,steel:4,food:5},
        army:{infantry:25,tank:12,fighter:10,bomber:2,drone:14,navy:8,submarine:4,sam:8,cruiseMissile:4},
        assets:['bosphorus'],neighbors:['ru','ge','ir','iq','sy','gr','bg'],power:58},
    eg:{name:'Egitto',flag:'🇪🇬',color:'#d4a259',profile:'opportunist',
        res:{money:120,oil:15,gas:20,rareEarth:2,gold:5,silver:1,diamonds:0,uranium:2,steel:10,food:30},
        prod:{money:15,oil:2,gas:3,food:5},
        army:{infantry:25,tank:10,fighter:8,bomber:2,drone:4,navy:5,submarine:3,sam:6,cruiseMissile:2},
        assets:['suez'],neighbors:['il','ly','sd','sa','ps'],power:50},
    kr:{name:'Corea del Sud',flag:'🇰🇷',color:'#3949ab',profile:'defensive',
        res:{money:280,oil:0,gas:1,rareEarth:3,gold:2,silver:3,diamonds:0,uranium:1,steel:25,food:20},
        prod:{money:32,steel:5,food:3},
        army:{infantry:22,tank:10,fighter:10,bomber:2,drone:8,navy:8,submarine:6,sam:10,cruiseMissile:4},
        neighbors:['cn','jp','kp'],power:52},
    kp:{name:'Corea del Nord',flag:'🇰🇵',color:'#ad1457',profile:'unstable',
        res:{money:30,oil:0,gas:0,rareEarth:10,gold:5,silver:2,diamonds:0,uranium:8,steel:10,food:5},
        prod:{money:3,rareEarth:2,uranium:2},
        army:{infantry:45,tank:8,fighter:4,drone:2,navy:3,submarine:5,sam:8,ballisticMissile:6,cruiseMissile:3},
        neighbors:['cn','kr','ru'],power:38},
    au:{name:'Australia',flag:'🇦🇺',color:'#00897b',profile:'neutral',
        res:{money:250,oil:10,gas:25,rareEarth:20,gold:25,silver:10,diamonds:15,uranium:30,steel:20,food:40},
        prod:{money:28,gas:4,rareEarth:4,gold:4,uranium:5,food:6},
        army:{infantry:12,tank:5,fighter:8,bomber:2,drone:6,navy:8,submarine:5,sam:6,cruiseMissile:2},
        neighbors:['id','nz','pg'],power:45},
    it:{name:'Italia',flag:'🇮🇹',color:'#66bb6a',profile:'defensive',
        res:{money:220,oil:3,gas:5,rareEarth:1,gold:2,silver:1,diamonds:0,uranium:1,steel:20,food:35},
        prod:{money:25,steel:3,food:5},
        army:{infantry:16,tank:8,fighter:8,bomber:2,drone:4,navy:8,submarine:4,sam:6,cruiseMissile:2},
        neighbors:['fr','de','at','ch','si'],power:48},
    es:{name:'Spagna',flag:'🇪🇸',color:'#ff7043',profile:'neutral',
        res:{money:180,oil:1,gas:2,rareEarth:2,gold:2,silver:3,diamonds:0,uranium:2,steel:15,food:30},
        prod:{money:20,steel:2,food:4},
        army:{infantry:14,tank:5,fighter:6,bomber:2,drone:4,navy:5,submarine:3,sam:4,cruiseMissile:1},
        assets:['gibraltar'],neighbors:['fr','pt','ma'],power:42},
    pl:{name:'Polonia',flag:'🇵🇱',color:'#ff6090',profile:'opportunist',
        res:{money:120,oil:2,gas:3,rareEarth:1,gold:2,silver:5,diamonds:0,uranium:1,steel:18,food:30},
        prod:{money:15,steel:3,food:4},
        army:{infantry:18,tank:10,fighter:6,bomber:1,drone:4,navy:2,submarine:1,sam:6,cruiseMissile:2},
        neighbors:['de','ru','ua','cz','sk','lt','by'],power:38},
    ua:{name:'Ucraina',flag:'🇺🇦',color:'#ffd600',profile:'opportunist',
        res:{money:60,oil:3,gas:8,rareEarth:5,gold:2,silver:1,diamonds:0,uranium:8,steel:15,food:50},
        prod:{money:8,gas:1,food:8},
        army:{infantry:28,tank:10,fighter:6,bomber:1,drone:12,navy:2,submarine:1,sam:8,cruiseMissile:2},
        neighbors:['ru','pl','ro','hu','sk','md','by'],power:38},
    pk:{name:'Pakistan',flag:'🇵🇰',color:'#26a69a',profile:'opportunist',
        res:{money:70,oil:3,gas:15,rareEarth:5,gold:3,silver:1,diamonds:2,uranium:5,steel:10,food:35},
        prod:{money:8,gas:2,food:5},
        army:{infantry:30,tank:10,fighter:8,bomber:2,drone:6,navy:4,submarine:3,sam:6,ballisticMissile:4,cruiseMissile:3},
        neighbors:['in','cn','af','ir'],power:45},
    id:{name:'Indonesia',flag:'🇮🇩',color:'#8d6e63',profile:'opportunist',
        res:{money:100,oil:15,gas:20,rareEarth:5,gold:10,silver:3,diamonds:2,uranium:2,steel:10,food:50},
        prod:{money:12,oil:2,gas:3,food:8},
        army:{infantry:20,tank:5,fighter:5,bomber:1,drone:4,navy:6,submarine:3,sam:4},
        assets:['malacca'],neighbors:['my','au','pg','ph','tl'],power:35},
    ng:{name:'Nigeria',flag:'🇳🇬',color:'#00e676',profile:'opportunist',
        res:{money:80,oil:40,gas:25,rareEarth:3,gold:3,silver:1,diamonds:1,uranium:2,steel:5,food:30},
        prod:{money:10,oil:6,gas:4,food:5},
        army:{infantry:16,tank:4,fighter:3,bomber:1,drone:2,navy:2,sam:2},
        neighbors:['cm','td','ne','bj','gh'],power:25},
    za:{name:'Sudafrica',flag:'🇿🇦',color:'#26a69a',profile:'neutral',
        res:{money:100,oil:2,gas:3,rareEarth:5,gold:30,silver:8,diamonds:35,uranium:5,steel:15,food:20},
        prod:{money:12,gold:5,diamonds:6,food:3},
        army:{infantry:14,tank:5,fighter:4,bomber:1,drone:3,navy:4,submarine:2,sam:3},
        assets:['capegood'],neighbors:['mz','bw','zw','na','ls','sz'],power:35},
    ca:{name:'Canada',flag:'🇨🇦',color:'#ff4081',profile:'neutral',
        res:{money:250,oil:50,gas:30,rareEarth:5,gold:10,silver:5,diamonds:10,uranium:15,steel:20,food:40},
        prod:{money:28,oil:8,gas:5,uranium:3,food:6},
        army:{infantry:12,tank:5,fighter:6,bomber:2,drone:4,navy:5,submarine:3,sam:4,cruiseMissile:1},
        assets:['arctic_route'],neighbors:['us','gl'],power:42},
    mx:{name:'Messico',flag:'🇲🇽',color:'#aeea00',profile:'opportunist',
        res:{money:120,oil:30,gas:10,rareEarth:2,gold:8,silver:20,diamonds:0,uranium:2,steel:15,food:35},
        prod:{money:15,oil:5,silver:4,food:5},
        army:{infantry:16,tank:4,fighter:4,drone:2,navy:3,submarine:1,sam:3},
        neighbors:['us','gt','bz','cu'],power:30},
    ar:{name:'Argentina',flag:'🇦🇷',color:'#81d4fa',profile:'neutral',
        res:{money:100,oil:10,gas:15,rareEarth:8,gold:5,silver:15,diamonds:0,uranium:5,steel:10,food:50},
        prod:{money:12,gas:2,silver:3,food:8},
        army:{infantry:14,tank:4,fighter:4,drone:2,navy:4,submarine:2,sam:2},
        neighbors:['br','cl','uy','py','bo'],power:28},
    co:{name:'Colombia',flag:'🇨🇴',color:'#fbc02d',profile:'opportunist',
        res:{money:80,oil:15,gas:8,rareEarth:2,gold:10,silver:5,diamonds:2,uranium:1,steel:5,food:30},
        prod:{money:10,oil:2,gold:2,food:4},
        army:{infantry:16,tank:3,fighter:3,drone:2,navy:3,submarine:1,sam:2},
        neighbors:['br','ve','pe','ec','pa'],power:25},
    ve:{name:'Venezuela',flag:'🇻🇪',color:'#b8860b',profile:'unstable',
        res:{money:50,oil:120,gas:30,rareEarth:2,gold:5,silver:1,diamonds:3,uranium:1,steel:5,food:15},
        prod:{money:6,oil:18,gas:4},
        army:{infantry:14,tank:4,fighter:3,drone:2,navy:2,sam:3,cruiseMissile:1},
        neighbors:['br','co','gy'],power:22},
    no:{name:'Norvegia',flag:'🇳🇴',color:'#5e92c2',profile:'neutral',
        res:{money:300,oil:40,gas:50,rareEarth:5,gold:2,silver:3,diamonds:0,uranium:1,steel:10,food:15},
        prod:{money:35,oil:6,gas:8},
        army:{infantry:8,tank:4,fighter:5,drone:3,navy:5,submarine:3,sam:4},
        assets:['arctic_route'],neighbors:['se','fi','ru','gb','dk'],power:38},
    se:{name:'Svezia',flag:'🇸🇪',color:'#4dd0e1',profile:'neutral',
        res:{money:220,oil:1,gas:1,rareEarth:3,gold:3,silver:5,diamonds:0,uranium:2,steel:15,food:20},
        prod:{money:25,steel:3,food:3},
        army:{infantry:10,tank:5,fighter:5,drone:3,navy:4,submarine:4,sam:5},
        neighbors:['no','fi','dk'],power:36},
    dz:{name:'Algeria',flag:'🇩🇿',color:'#827717',profile:'opportunist',
        res:{money:70,oil:30,gas:40,rareEarth:3,gold:3,silver:1,diamonds:0,uranium:2,steel:5,food:10},
        prod:{money:8,oil:4,gas:6},
        army:{infantry:18,tank:8,fighter:6,bomber:1,drone:4,navy:4,submarine:2,sam:4},
        neighbors:['ly','tn','ma','ml','ne','mr','eh'],power:32},
    ly:{name:'Libia',flag:'🇱🇾',color:'#78909c',profile:'unstable',
        res:{money:50,oil:50,gas:15,rareEarth:1,gold:2,silver:0,diamonds:0,uranium:1,steel:3,food:5},
        prod:{money:6,oil:8,gas:2},
        army:{infantry:10,tank:3,fighter:2,drone:2,navy:1,sam:2},
        neighbors:['eg','tn','dz','td','sd','ne'],power:18},
    iq:{name:'Iraq',flag:'🇮🇶',color:'#6d4c41',profile:'opportunist',
        res:{money:80,oil:80,gas:25,rareEarth:2,gold:2,silver:1,diamonds:0,uranium:2,steel:5,food:15},
        prod:{money:10,oil:12,gas:3},
        army:{infantry:18,tank:6,fighter:4,drone:4,navy:1,sam:4,cruiseMissile:2},
        neighbors:['ir','sa','kw','tr','sy','jo'],power:28},
    et:{name:'Etiopia',flag:'🇪🇹',color:'#9e9d24',profile:'opportunist',
        res:{money:30,oil:2,gas:5,rareEarth:8,gold:8,silver:2,diamonds:2,uranium:1,steel:3,food:20},
        prod:{money:4,gold:1,food:3},
        army:{infantry:18,tank:3,fighter:2,drone:2,sam:2},
        neighbors:['sd','ss','ke','so','er','dj'],power:22},
    th:{name:'Thailandia',flag:'🇹🇭',color:'#ab47bc',profile:'neutral',
        res:{money:120,oil:3,gas:8,rareEarth:3,gold:5,silver:2,diamonds:1,uranium:1,steel:8,food:40},
        prod:{money:14,gas:1,food:6},
        army:{infantry:14,tank:5,fighter:5,drone:3,navy:4,submarine:2,sam:4},
        neighbors:['mm','la','kh','my'],power:30},
    af:{name:'Afghanistan',flag:'🇦🇫',color:'#455a64',profile:'unstable',
        res:{money:10,oil:2,gas:5,rareEarth:25,gold:5,silver:3,diamonds:1,uranium:3,steel:3,food:10},
        prod:{money:2,rareEarth:5},
        army:{infantry:20,tank:2,drone:1,sam:2},
        neighbors:['pk','ir','tm','uz','tj','cn'],power:15},
    cd:{name:'RD Congo',flag:'🇨🇩',color:'#18ffff',profile:'opportunist',
        res:{money:30,oil:5,gas:2,rareEarth:40,gold:15,silver:3,diamonds:25,uranium:10,steel:5,food:15},
        prod:{money:4,rareEarth:8,gold:3,diamonds:5},
        army:{infantry:14,tank:2,fighter:1,drone:1,sam:1},
        neighbors:['cg','cf','ss','ug','rw','bi','tz','zm','ao'],power:15},
    my:{name:'Malaysia',flag:'🇲🇾',color:'#7c4dff',profile:'neutral',
        res:{money:100,oil:10,gas:15,rareEarth:3,gold:2,silver:1,diamonds:0,uranium:0,steel:8,food:20},
        prod:{money:14,oil:2,gas:2,food:3},
        army:{infantry:10,tank:4,fighter:4,drone:2,navy:4,submarine:2,sam:3},
        assets:['malacca'],neighbors:['id','th','bn','ph','sg'],power:28},
    pe:{name:'Perù',flag:'🇵🇪',color:'#ffa726',profile:'neutral',
        res:{money:60,oil:3,gas:5,rareEarth:2,gold:10,silver:15,diamonds:0,uranium:1,steel:5,food:25},
        prod:{money:8,gold:2,silver:3,food:4},
        army:{infantry:12,tank:3,fighter:3,drone:1,navy:2,sam:2},
        neighbors:['br','co','ec','bo','cl'],power:22},
    cl:{name:'Cile',flag:'🇨🇱',color:'#9b2335',profile:'neutral',
        res:{money:80,oil:2,gas:3,rareEarth:5,gold:5,silver:8,diamonds:0,uranium:1,steel:8,food:20},
        prod:{money:10,silver:2,food:3},
        army:{infantry:10,tank:4,fighter:4,drone:1,navy:3,submarine:2,sam:2},
        neighbors:['ar','pe','bo'],power:22},
    kz:{name:'Kazakistan',flag:'🇰🇿',color:'#00acc1',profile:'opportunist',
        res:{money:60,oil:40,gas:20,rareEarth:10,gold:8,silver:3,diamonds:2,uranium:25,steel:10,food:15},
        prod:{money:8,oil:6,gas:3,uranium:5},
        army:{infantry:14,tank:6,fighter:4,drone:2,sam:4},
        neighbors:['ru','cn','uz','tm','kg'],power:28},
    ph:{name:'Filippine',flag:'🇵🇭',color:'#7986cb',profile:'neutral',
        res:{money:80,oil:2,gas:3,rareEarth:3,gold:5,silver:2,diamonds:0,uranium:0,steel:5,food:30},
        prod:{money:10,food:5},
        army:{infantry:14,tank:2,fighter:3,drone:2,navy:3,sam:2},
        neighbors:['my','id','tw','cn'],power:22},
    tw:{name:'Taiwan',flag:'🇹🇼',color:'#00b0ff',profile:'defensive',
        res:{money:250,oil:0,gas:0,rareEarth:5,gold:1,silver:1,diamonds:0,uranium:0,steel:15,food:10},
        prod:{money:30,rareEarth:2,steel:4},
        army:{infantry:14,tank:6,fighter:10,drone:8,navy:8,submarine:4,sam:14,cruiseMissile:4},
        assets:['taiwan_strait'],neighbors:['cn','jp','ph'],power:45},
    vn:{name:'Vietnam',flag:'🇻🇳',color:'#e64a19',profile:'opportunist',
        res:{money:70,oil:8,gas:5,rareEarth:15,gold:3,silver:1,diamonds:0,uranium:1,steel:8,food:35},
        prod:{money:10,oil:1,rareEarth:3,food:5},
        army:{infantry:22,tank:6,fighter:5,drone:4,navy:4,submarine:4,sam:6},
        neighbors:['cn','la','kh'],power:30},
    mm:{name:'Myanmar',flag:'🇲🇲',color:'#a1887f',profile:'unstable',
        res:{money:20,oil:2,gas:5,rareEarth:15,gold:3,silver:1,diamonds:3,uranium:2,steel:3,food:20},
        prod:{money:3,rareEarth:3,food:3},
        army:{infantry:16,tank:3,fighter:2,drone:1,navy:2,sam:1},
        neighbors:['cn','in','th','la','bd'],power:15},
    nz:{name:'Nuova Zelanda',flag:'🇳🇿',color:'#80cbc4',profile:'neutral',
        res:{money:120,oil:1,gas:2,rareEarth:1,gold:3,silver:2,diamonds:0,uranium:0,steel:5,food:25},
        prod:{money:15,food:4},
        army:{infantry:6,tank:2,fighter:3,drone:1,navy:3,submarine:1,sam:2},
        neighbors:['au'],power:18}
};

/* ── Minor-state names & flags ── */
const MINOR_NAMES = {
    ad:{name:'Andorra',flag:'🇦🇩'},
    ae:{name:'Emirati Arabi',flag:'🇦🇪'},
    ag:{name:'Antigua e Barbuda',flag:'🇦🇬'},
    ai:{name:'Anguilla',flag:'🇦🇮'},
    al:{name:'Albania',flag:'🇦🇱'},
    am:{name:'Armenia',flag:'🇦🇲'},
    an:{name:'Antille Olandesi',flag:'🇳🇱'},
    ao:{name:'Angola',flag:'🇦🇴'},
    aq:{name:'Antartide',flag:'🏔️'},
    as:{name:'Samoa Americane',flag:'🇦🇸'},
    at:{name:'Austria',flag:'🇦🇹'},
    aw:{name:'Aruba',flag:'🇦🇼'},
    az:{name:'Azerbaigian',flag:'🇦🇿'},
    ba:{name:'Bosnia-Erzegovina',flag:'🇧🇦'},
    bb:{name:'Barbados',flag:'🇧🇧'},
    bd:{name:'Bangladesh',flag:'🇧🇩'},
    be:{name:'Belgio',flag:'🇧🇪'},
    bf:{name:'Burkina Faso',flag:'🇧🇫'},
    bg:{name:'Bulgaria',flag:'🇧🇬'},
    bh:{name:'Bahrein',flag:'🇧🇭'},
    bi:{name:'Burundi',flag:'🇧🇮'},
    bj:{name:'Benin',flag:'🇧🇯'},
    bm:{name:'Bermuda',flag:'🇧🇲'},
    bn:{name:'Brunei',flag:'🇧🇳'},
    bo:{name:'Bolivia',flag:'🇧🇴'},
    bs:{name:'Bahamas',flag:'🇧🇸'},
    bt:{name:'Bhutan',flag:'🇧🇹'},
    bw:{name:'Botswana',flag:'🇧🇼'},
    by:{name:'Bielorussia',flag:'🇧🇾'},
    bz:{name:'Belize',flag:'🇧🇿'},
    cf:{name:'Rep. Centrafricana',flag:'🇨🇫'},
    cg:{name:'Congo',flag:'🇨🇬'},
    ch:{name:'Svizzera',flag:'🇨🇭'},
    ci:{name:'Costa d\'Avorio',flag:'🇨🇮'},
    ck:{name:'Isole Cook',flag:'🇨🇰'},
    cm:{name:'Camerun',flag:'🇨🇲'},
    cr:{name:'Costa Rica',flag:'🇨🇷'},
    cu:{name:'Cuba',flag:'🇨🇺'},
    cv:{name:'Capo Verde',flag:'🇨🇻'},
    cy:{name:'Cipro',flag:'🇨🇾'},
    cz:{name:'Rep. Ceca',flag:'🇨🇿'},
    dj:{name:'Gibuti',flag:'🇩🇯'},
    dk:{name:'Danimarca',flag:'🇩🇰'},
    dm:{name:'Dominica',flag:'🇩🇲'},
    'do':{name:'Rep. Dominicana',flag:'🇩🇴'},
    ec:{name:'Ecuador',flag:'🇪🇨'},
    ee:{name:'Estonia',flag:'🇪🇪'},
    eh:{name:'Sahara Occ.',flag:'🇪🇭'},
    er:{name:'Eritrea',flag:'🇪🇷'},
    fi:{name:'Finlandia',flag:'🇫🇮'},
    fj:{name:'Fiji',flag:'🇫🇯'},
    fk:{name:'Isole Falkland',flag:'🇫🇰'},
    fm:{name:'Micronesia',flag:'🇫🇲'},
    fo:{name:'Isole Fær Øer',flag:'🇫🇴'},
    ga:{name:'Gabon',flag:'🇬🇦'},
    gd:{name:'Grenada',flag:'🇬🇩'},
    ge:{name:'Georgia',flag:'🇬🇪'},
    gf:{name:'Guyana Francese',flag:'🇬🇫'},
    gg:{name:'Guernsey',flag:'🇬🇬'},
    gh:{name:'Ghana',flag:'🇬🇭'},
    gi:{name:'Gibilterra',flag:'🇬🇮'},
    gl:{name:'Groenlandia',flag:'🇬🇱'},
    gm:{name:'Gambia',flag:'🇬🇲'},
    gn:{name:'Guinea',flag:'🇬🇳'},
    gp:{name:'Guadalupa',flag:'🇬🇵'},
    gq:{name:'Guinea Equat.',flag:'🇬🇶'},
    gr:{name:'Grecia',flag:'🇬🇷'},
    gt:{name:'Guatemala',flag:'🇬🇹'},
    gu:{name:'Guam',flag:'🇬🇺'},
    gw:{name:'Guinea-Bissau',flag:'🇬🇼'},
    gy:{name:'Guyana',flag:'🇬🇾'},
    hn:{name:'Honduras',flag:'🇭🇳'},
    hr:{name:'Croazia',flag:'🇭🇷'},
    ht:{name:'Haiti',flag:'🇭🇹'},
    hu:{name:'Ungheria',flag:'🇭🇺'},
    ie:{name:'Irlanda',flag:'🇮🇪'},
    im:{name:'Isola di Man',flag:'🇮🇲'},
    is:{name:'Islanda',flag:'🇮🇸'},
    je:{name:'Jersey',flag:'🇯🇪'},
    jm:{name:'Giamaica',flag:'🇯🇲'},
    jo:{name:'Giordania',flag:'🇯🇴'},
    ke:{name:'Kenya',flag:'🇰🇪'},
    kg:{name:'Kirghizistan',flag:'🇰🇬'},
    kh:{name:'Cambogia',flag:'🇰🇭'},
    ki:{name:'Kiribati',flag:'🇰🇮'},
    km:{name:'Comore',flag:'🇰🇲'},
    kn:{name:'Saint Kitts e Nevis',flag:'🇰🇳'},
    kw:{name:'Kuwait',flag:'🇰🇼'},
    ky:{name:'Isole Cayman',flag:'🇰🇾'},
    la:{name:'Laos',flag:'🇱🇦'},
    lb:{name:'Libano',flag:'🇱🇧'},
    lc:{name:'Santa Lucia',flag:'🇱🇨'},
    li:{name:'Liechtenstein',flag:'🇱🇮'},
    lk:{name:'Sri Lanka',flag:'🇱🇰'},
    lr:{name:'Liberia',flag:'🇱🇷'},
    ls:{name:'Lesotho',flag:'🇱🇸'},
    lt:{name:'Lituania',flag:'🇱🇹'},
    lu:{name:'Lussemburgo',flag:'🇱🇺'},
    lv:{name:'Lettonia',flag:'🇱🇻'},
    ma:{name:'Marocco',flag:'🇲🇦'},
    mc:{name:'Monaco',flag:'🇲🇨'},
    md:{name:'Moldavia',flag:'🇲🇩'},
    me:{name:'Montenegro',flag:'🇲🇪'},
    mg:{name:'Madagascar',flag:'🇲🇬'},
    mh:{name:'Isole Marshall',flag:'🇲🇭'},
    mk:{name:'Macedonia del Nord',flag:'🇲🇰'},
    ml:{name:'Mali',flag:'🇲🇱'},
    mn:{name:'Mongolia',flag:'🇲🇳'},
    mp:{name:'Isole Marianne',flag:'🇲🇵'},
    mq:{name:'Martinica',flag:'🇲🇶'},
    mr:{name:'Mauritania',flag:'🇲🇷'},
    ms:{name:'Montserrat',flag:'🇲🇸'},
    mt:{name:'Malta',flag:'🇲🇹'},
    mu:{name:'Mauritius',flag:'🇲🇺'},
    mv:{name:'Maldive',flag:'🇲🇻'},
    mw:{name:'Malawi',flag:'🇲🇼'},
    mz:{name:'Mozambico',flag:'🇲🇿'},
    na:{name:'Namibia',flag:'🇳🇦'},
    nc:{name:'Nuova Caledonia',flag:'🇳🇨'},
    ne:{name:'Niger',flag:'🇳🇪'},
    ni:{name:'Nicaragua',flag:'🇳🇮'},
    nl:{name:'Paesi Bassi',flag:'🇳🇱'},
    np:{name:'Nepal',flag:'🇳🇵'},
    nr:{name:'Nauru',flag:'🇳🇷'},
    nu:{name:'Niue',flag:'🇳🇺'},
    om:{name:'Oman',flag:'🇴🇲'},
    pa:{name:'Panama',flag:'🇵🇦'},
    pf:{name:'Polinesia Francese',flag:'🇵🇫'},
    pg:{name:'Papua Nuova Guinea',flag:'🇵🇬'},
    pm:{name:'Saint-Pierre',flag:'🇵🇲'},
    pn:{name:'Isole Pitcairn',flag:'🇵🇳'},
    pr:{name:'Porto Rico',flag:'🇵🇷'},
    ps:{name:'Palestina',flag:'🇵🇸'},
    pt:{name:'Portogallo',flag:'🇵🇹'},
    pw:{name:'Palau',flag:'🇵🇼'},
    py:{name:'Paraguay',flag:'🇵🇾'},
    qa:{name:'Qatar',flag:'🇶🇦'},
    re:{name:'Riunione',flag:'🇷🇪'},
    ro:{name:'Romania',flag:'🇷🇴'},
    rs:{name:'Serbia',flag:'🇷🇸'},
    rw:{name:'Ruanda',flag:'🇷🇼'},
    sb:{name:'Isole Salomone',flag:'🇸🇧'},
    sc:{name:'Seychelles',flag:'🇸🇨'},
    sd:{name:'Sudan',flag:'🇸🇩'},
    sg:{name:'Singapore',flag:'🇸🇬'},
    sh:{name:'Sant\'Elena',flag:'🇸🇭'},
    si:{name:'Slovenia',flag:'🇸🇮'},
    sk:{name:'Slovacchia',flag:'🇸🇰'},
    sl:{name:'Sierra Leone',flag:'🇸🇱'},
    sm:{name:'San Marino',flag:'🇸🇲'},
    sn:{name:'Senegal',flag:'🇸🇳'},
    so:{name:'Somalia',flag:'🇸🇴'},
    sr:{name:'Suriname',flag:'🇸🇷'},
    ss:{name:'Sud Sudan',flag:'🇸🇸'},
    st:{name:'São Tomé e Príncipe',flag:'🇸🇹'},
    sv:{name:'El Salvador',flag:'🇸🇻'},
    sy:{name:'Siria',flag:'🇸🇾'},
    sz:{name:'Eswatini',flag:'🇸🇿'},
    tc:{name:'Turks e Caicos',flag:'🇹🇨'},
    td:{name:'Ciad',flag:'🇹🇩'},
    tg:{name:'Togo',flag:'🇹🇬'},
    tj:{name:'Tagikistan',flag:'🇹🇯'},
    tl:{name:'Timor Est',flag:'🇹🇱'},
    tm:{name:'Turkmenistan',flag:'🇹🇲'},
    tn:{name:'Tunisia',flag:'🇹🇳'},
    to:{name:'Tonga',flag:'🇹🇴'},
    tt:{name:'Trinidad e Tobago',flag:'🇹🇹'},
    tv:{name:'Tuvalu',flag:'🇹🇻'},
    tz:{name:'Tanzania',flag:'🇹🇿'},
    ug:{name:'Uganda',flag:'🇺🇬'},
    uy:{name:'Uruguay',flag:'🇺🇾'},
    uz:{name:'Uzbekistan',flag:'🇺🇿'},
    va:{name:'Città del Vaticano',flag:'🇻🇦'},
    vc:{name:'Saint Vincent',flag:'🇻🇨'},
    vg:{name:'Isole Vergini Brit.',flag:'🇻🇬'},
    vi:{name:'Isole Vergini USA',flag:'🇻🇮'},
    vu:{name:'Vanuatu',flag:'🇻🇺'},
    wf:{name:'Wallis e Futuna',flag:'🇼🇫'},
    ws:{name:'Samoa',flag:'🇼🇸'},
    ye:{name:'Yemen',flag:'🇾🇪'},
    yt:{name:'Mayotte',flag:'🇾🇹'},
    zm:{name:'Zambia',flag:'🇿🇲'},
    zw:{name:'Zimbabwe',flag:'🇿🇼'}
};

const MINOR_IDS = new Set(SVG_IDS.filter(c => !NATIONS[c]));
/* ── Resource overrides for notable minor nations ──
   Gulf petrostates and other resource-rich minors get realistic production
   instead of the generic minor defaults. */
const MINOR_OVERRIDES = {
    qa: { res:{money:180,oil:60,gas:90,rareEarth:0,gold:2,silver:0,diamonds:0,uranium:0,steel:3,food:2},
          prod:{money:25,oil:10,gas:18} },
    ae: { res:{money:250,oil:70,gas:30,rareEarth:1,gold:5,silver:1,diamonds:3,uranium:0,steel:5,food:3},
          prod:{money:30,oil:12,gas:5} },
    kw: { res:{money:150,oil:80,gas:15,rareEarth:0,gold:1,silver:0,diamonds:0,uranium:0,steel:2,food:1},
          prod:{money:20,oil:14,gas:3} },
    bh: { res:{money:80,oil:25,gas:10,rareEarth:0,gold:0,silver:0,diamonds:0,uranium:0,steel:1,food:1},
          prod:{money:12,oil:5,gas:2} },
    om: { res:{money:70,oil:40,gas:20,rareEarth:0,gold:1,silver:1,diamonds:0,uranium:0,steel:2,food:3},
          prod:{money:10,oil:8,gas:4} },
    ye: { res:{money:20,oil:15,gas:8,rareEarth:0,gold:0,silver:0,diamonds:0,uranium:0,steel:1,food:5},
          prod:{money:3,oil:3,gas:1,food:1} },
    ly: { res:{money:40,oil:60,gas:20,rareEarth:0,gold:2,silver:0,diamonds:0,uranium:0,steel:2,food:3},
          prod:{money:5,oil:10,gas:3} },
    ao: { res:{money:30,oil:50,gas:10,rareEarth:1,gold:1,silver:0,diamonds:8,uranium:0,steel:2,food:8},
          prod:{money:4,oil:8,diamonds:1} },
    az: { res:{money:40,oil:35,gas:25,rareEarth:0,gold:1,silver:0,diamonds:0,uranium:0,steel:3,food:6},
          prod:{money:5,oil:6,gas:4} },
    tm: { res:{money:25,oil:20,gas:60,rareEarth:0,gold:0,silver:0,diamonds:0,uranium:0,steel:2,food:5},
          prod:{money:3,oil:3,gas:10} },
    bn: { res:{money:80,oil:30,gas:25,rareEarth:0,gold:0,silver:0,diamonds:0,uranium:0,steel:1,food:2},
          prod:{money:10,oil:5,gas:5} },
};

function getMinorNation(code) {
    /* Generate a visible distinct color per minor nation from its code */
    const h = ((code.charCodeAt(0) * 137 + code.charCodeAt(1) * 59) % 360);
    const minorColor = `hsl(${h}, 45%, 55%)`;
    const info = MINOR_NAMES[code] || { name: code.toUpperCase(), flag: '🏳️' };
    const ovr = MINOR_OVERRIDES[code];
    return {
        name: info.name, flag: info.flag, color: minorColor, profile:'minor',
        res:  ovr?.res  || {money:60,oil:2,gas:1,rareEarth:1,gold:1,silver:0,diamonds:0,uranium:0,steel:5,food:15},
        prod: ovr?.prod || {money:12,food:2,steel:1},
        army:{infantry:8,tank:2,drone:1,sam:1},
        assets:[], neighbors:[], power:8
    };
}
function getNation(code) { return NATIONS[code] || getMinorNation(code); }

/* ── Build global adjacency map from declared neighbor lists ──
   This creates a symmetric graph: if A lists B as neighbor, B also knows A.
   This is critical for expansion through conquered minor territories. */
const ADJACENCY = (() => {
    const adj = {};
    SVG_IDS.forEach(c => adj[c] = new Set());

    /* Seed from all NATIONS neighbor lists */
    Object.entries(NATIONS).forEach(([code, nation]) => {
        (nation.neighbors || []).forEach(nb => {
            if (adj[code]) adj[code].add(nb);
            if (adj[nb]) adj[nb].add(code);
        });
    });

    /* Convert Sets to frozen arrays for fast iteration */
    const result = {};
    SVG_IDS.forEach(c => result[c] = [...(adj[c] || [])]);
    return result;
})();

function getNeighborsOf(code) { return ADJACENCY[code] || []; }

/* ── Sea routes: pairs of territories connected by water ──
   These allow naval transport (ground units via navy) and
   naval attacks. If two territories share a sea route, they
   can reach each other with ships even if not land-adjacent. */
const SEA_ROUTES = (() => {
    const pairs = [
        /* Atlantic */
        ['us','gb'],['us','cu'],['us','bs'],['us','jm'],['us','ie'],['us','is'],
        ['gb','fr'],['gb','no'],['gb','ie'],['gb','is'],['gb','nl'],['gb','be'],['gb','dk'],
        ['fr','dz'],['fr','ma'],['fr','tn'],['fr','it'],['fr','es'],
        ['es','ma'],['es','cu'],['es','pt'],
        ['pt','br'],['pt','cv'],['pt','ma'],
        ['br','ar'],['br','ng'],['br','gf'],
        ['ar','cl'],['ar','uy'],['ar','fk'],
        /* Mediterranean */
        ['it','gr'],['it','tn'],['it','hr'],['it','mt'],['it','al'],['it','ly'],['it','eg'],
        ['gr','tr'],['gr','cy'],['gr','eg'],['gr','al'],
        ['tr','ua'],['tr','ge'],['tr','cy'],['tr','eg'],['tr','sy'],['tr','lb'],
        ['eg','sa'],['eg','il'],['eg','jo'],
        /* Red Sea / Indian Ocean */
        ['sa','er'],['sa','dj'],['sa','so'],['sa','ye'],['sa','ae'],['sa','om'],
        ['ae','ir'],['ae','pk'],['ae','om'],
        ['ir','pk'],['ir','om'],['ir','iq'],
        ['in','lk'],['in','mv'],['in','mm'],['in','bd'],['in','pk'],['in','ae'],['in','om'],['in','ke'],
        ['so','ye'],['so','ke'],['so','dj'],
        ['ke','tz'],['ke','mz'],['tz','mz'],['mz','za'],['mz','mg'],
        ['za','ao'],['za','na'],['za','ar'],
        /* East Asia / Pacific */
        ['cn','jp'],['cn','kr'],['cn','tw'],['cn','ph'],['cn','vn'],
        ['jp','kr'],['jp','tw'],['jp','ru'],['jp','ph'],['jp','us'],
        ['kr','jp'],
        ['tw','ph'],['tw','jp'],
        ['ph','id'],['ph','my'],
        ['id','au'],['id','my'],['id','tl'],['id','pg'],['id','sg'],
        ['au','nz'],['au','pg'],['au','id'],['au','fj'],
        ['my','sg'],['my','th'],['my','bn'],
        ['th','mm'],['th','kh'],['th','vn'],
        /* Persian Gulf */
        ['kw','iq'],['kw','ir'],['kw','sa'],
        ['qa','sa'],['qa','ae'],['qa','bh'],
        ['bh','sa'],
        /* Baltic / Northern Europe */
        ['se','fi'],['se','dk'],['se','no'],['se','de'],['se','pl'],['se','ee'],
        ['fi','ee'],['fi','ru'],
        ['dk','de'],['dk','no'],['dk','se'],
        ['de','dk'],['de','se'],
        ['ee','fi'],['ee','lv'],
        ['no','ru'],['no','is'],['no','gb'],
        /* Black Sea */
        ['ua','tr'],['ua','ro'],['ua','ge'],['ua','ru'],['ua','bg'],
        ['ro','bg'],['ro','tr'],
        ['ge','ru'],
        /* Caribbean */
        ['cu','mx'],['cu','jm'],['cu','ht'],['cu','bs'],
        ['ht','do'],['do','pr'],['pr','us'],
        ['jm','co'],['jm','pa'],
        ['tt','ve'],
        /* West Africa */
        ['ng','cm'],['ng','gh'],['ng','sn'],
        ['sn','mr'],['sn','gm'],['sn','gn'],['sn','cv'],
        ['gh','ci'],['ci','lr'],['lr','sl'],
        ['cm','gq'],['gq','ga'],['ga','cg'],['cg','ao'],
        /* East Africa / Madagascar */
        ['mg','mz'],['mg','tz'],
        /* Central America */
        ['pa','co'],['pa','cr'],['cr','ni'],['ni','hn'],['hn','bz'],['bz','mx'],
        /* Oceania */
        ['nz','fj'],['fj','to'],['pg','sb'],
    ];

    /* Build symmetric map */
    const map = {};
    SVG_IDS.forEach(c => map[c] = new Set());
    pairs.forEach(([a, b]) => {
        if (map[a]) map[a].add(b);
        if (map[b]) map[b].add(a);
    });

    const result = {};
    SVG_IDS.forEach(c => result[c] = [...(map[c] || [])]);
    return result;
})();

/** Check if two territories are connected by sea */
function isSeaConnected(codeA, codeB) {
    return (SEA_ROUTES[codeA] || []).includes(codeB);
}

/**
 * Determine if an attacker can reach a defender territory, and HOW.
 * Returns { reachable, method, reason }
 *   method: 'land' | 'sea_transport' | 'naval' | 'air' | 'missile' | null
 *   reason: human-readable Italian explanation if NOT reachable
 *
 * PERF: caches myTerritories per attacker per turn to avoid O(n) scan
 *       on every call (was 357ms in profiling).
 */
const _reachTerritoryCache = { code: null, turn: -1, terrs: null };

function canReachTerritory(attackerCode, defenderTerritoryCode, attackerArmy) {
    const army = attackerArmy || {};

    /* Gather all territories owned by attacker — CACHED per attacker+turn+terrCount.
       Invalidates when attacker changes, turn changes, OR territory count changes
       (which happens mid-turn after conquests). */
    let myTerritories;
    if (typeof GameEngine !== 'undefined') {
        const st = GameEngine.getState();
        const turn = st ? st.turn : -1;
        const tCount = GameEngine.getTerritoryCount(attackerCode);
        if (_reachTerritoryCache.code === attackerCode
            && _reachTerritoryCache.turn === turn
            && _reachTerritoryCache.count === tCount) {
            myTerritories = _reachTerritoryCache.terrs;
        } else {
            myTerritories = [];
            for (const tCode of SVG_IDS) {
                if (st.territories[tCode] === attackerCode) myTerritories.push(tCode);
            }
            _reachTerritoryCache.code = attackerCode;
            _reachTerritoryCache.turn = turn;
            _reachTerritoryCache.count = tCount;
            _reachTerritoryCache.terrs = myTerritories;
        }
    } else {
        myTerritories = [attackerCode];
    }

    /* Detect available capabilities for support info */
    const hasNavy = (army.navy || 0) > 0 || (army.submarine || 0) > 0;
    const hasAir = (army.bomber || 0) > 0 || (army.drone || 0) > 0 || (army.fighter || 0) > 0;
    const hasMissiles = (army.cruiseMissile || 0) > 0 || (army.ballisticMissile || 0) > 0;
    const hasNuke = (army.nuke || 0) > 0;

    function buildSupport(excludeMethod) {
        const s = [];
        if (excludeMethod !== 'missile' && (hasMissiles || hasNuke)) s.push('missile');
        if (excludeMethod !== 'air' && hasAir) s.push('air');
        if (excludeMethod !== 'sea_transport' && hasNavy) s.push('naval');
        return s;
    }

    /* 1. Direct land adjacency — PRIORITY: attack via terra */
    const landSource = myTerritories.find(mt =>
        (ADJACENCY[mt] || []).includes(defenderTerritoryCode));
    if (landSource) {
        return { reachable: true, method: 'land', reason: null, launchFrom: landSource, support: buildSupport('land') };
    }

    /* 2. Sea connection with navy → attack via mare */
    const seaSource = myTerritories.find(mt =>
        isSeaConnected(mt, defenderTerritoryCode));
    if (seaSource && hasNavy) {
        return { reachable: true, method: 'sea_transport', reason: null, launchFrom: seaSource, support: buildSupport('sea_transport') };
    }

    /* 3. Sea connection WITHOUT navy → blocked */
    if (seaSource && !hasNavy) {
        return {
            reachable: false, method: null, launchFrom: null, support: [],
            reason: '⚓ Collegamento via mare disponibile ma non hai navi! Costruisci Flotta Navale o Sottomarini.'
        };
    }

    /* 4. Long-range: missiles, bombers, drones can strike anywhere. */
    const homeland = attackerCode;
    const preferredBase = myTerritories.includes(homeland) ? homeland : myTerritories[0];
    if (hasMissiles || hasNuke) {
        return { reachable: true, method: 'missile', reason: null, launchFrom: preferredBase, support: buildSupport('missile') };
    }
    if (hasAir) {
        return { reachable: true, method: 'air', reason: null, launchFrom: preferredBase, support: buildSupport('air') };
    }

    /* 5. Not reachable */
    return {
        reachable: false, method: null, launchFrom: null, support: [],
        reason: '🚫 Territorio non raggiungibile! Serve: ⚓ Navi (via mare), ✈️ Aerei/Droni, o 🚀 Missili per attaccare a distanza.'
    };
}
