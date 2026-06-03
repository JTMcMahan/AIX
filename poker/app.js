const $ = id => document.getElementById(id);
const state = { hero:[], flop:[], turn:[], river:[], wildSpecific:[], wildRanks:[] };
const zones = { hero: $('heroCards'), flop: $('flopCards'), turn: $('turnCards'), river: $('riverCards'), wildSpecific: $('wildSpecificCards') };
function maxHero(){ const m=$('gameMode').value; return m==='holdem'?2:(m==='omaha3'?3:4); }
function zoneLimit(zone){ return zone==='hero'?maxHero():zone==='flop'?3:zone==='turn'?1:zone==='river'?1:99; }
function allSelected(){ return [...state.hero,...state.flop,...state.turn,...state.river,...state.wildSpecific]; }
function boardCards(){ return [...state.flop,...state.turn,...state.river]; }
function isRed(c){ return c[1]==='h'||c[1]==='d'; }
function renderSlots(){
  for(const z of Object.keys(zones)){
    zones[z].innerHTML='';
    state[z].forEach(c=>{ const d=document.createElement('button'); d.className='card small '+(isRed(c)?'red':''); d.textContent=PokerOddsEngine.cardLabel(c); d.title='Click to remove'; d.onclick=()=>{ state[z]=state[z].filter(x=>x!==c); render(); }; zones[z].appendChild(d); });
  }
}
function renderDeck(){
  const deck=$('deck'); deck.innerHTML=''; const selected=new Set(allSelected());
  for(const c of PokerOddsEngine.makeDeck()){
    const b=document.createElement('button'); b.className='card '+(isRed(c)?'red ':'')+(selected.has(c)?'selected':''); b.textContent=PokerOddsEngine.cardLabel(c);
    b.onclick=()=>selectCard(c); deck.appendChild(b);
  }
}
function renderWildRanks(){
  const wrap=$('rankWilds'); wrap.innerHTML='';
  for(const r of PokerOddsEngine.RANKS){
    const b=document.createElement('button'); b.className='rank-pill '+(state.wildRanks.includes(r)?'active':''); b.textContent=r;
    b.onclick=()=>{ state.wildRanks = state.wildRanks.includes(r) ? state.wildRanks.filter(x=>x!==r) : [...state.wildRanks,r]; renderWildRanks(); };
    wrap.appendChild(b);
  }
}
function selectCard(c){
  const zone=$('targetZone').value;
  // Remove from every zone if selected already
  if(allSelected().includes(c)){ for(const z of Object.keys(state)){ if(Array.isArray(state[z])) state[z]=state[z].filter(x=>x!==c); } render(); return; }
  if(state[zone].length>=zoneLimit(zone)){ setStatus(`${zoneLabel(zone)} is full. Remove a card or change the entry target.`, true); return; }
  state[zone].push(c); render();
}
function zoneLabel(z){ return ({hero:'Pocket Cards',flop:'Flop',turn:'Turn',river:'River',wildSpecific:'Specific Wild Cards'})[z]||z; }
function render(){ renderSlots(); renderDeck(); }
function setStatus(msg, err=false){ $('status').innerHTML = `<span class="${err?'error':'ok'}">${msg}</span>`; }
function pct(n){ return `${n.toFixed(1)}%`; }
function setMeter(id,p){ $(id+'Pct').textContent=pct(p); $(id+'Bar').style.width=Math.max(0,Math.min(100,p))+'%'; }
function calculate(){
  try{
    setStatus('Calculating...');
    setTimeout(()=>{
      try{
        const result=PokerOddsEngine.runSimulation({
          mode:$('gameMode').value,
          heroCards:state.hero.slice(),
          boardCards:boardCards(),
          players:parseInt($('players').value,10),
          iterations:parseInt($('iterations').value,10),
          wildRanks:state.wildRanks.slice(),
          wildSpecific:state.wildSpecific.slice()
        });
        setMeter('win',result.winPct); setMeter('tie',result.tiePct); setMeter('lose',result.losePct);
        $('madeHand').textContent='Made hand: '+result.heroMadeHand;
        $('simCount').textContent='Simulations: '+result.iterations.toLocaleString();
        setStatus(result.note);
      } catch(e){ setStatus(e.message, true); }
    },20);
  } catch(e){ setStatus(e.message, true); }
}
$('runBtn').onclick=calculate;
$('clearBoardBtn').onclick=()=>{ state.flop=[]; state.turn=[]; state.river=[]; render(); };
$('resetBtn').onclick=()=>{ state.hero=[]; state.flop=[]; state.turn=[]; state.river=[]; state.wildSpecific=[]; state.wildRanks=[]; render(); renderWildRanks(); setMeter('win',0); setMeter('tie',0); setMeter('lose',0); $('winPct').textContent=$('tiePct').textContent=$('losePct').textContent='—'; $('madeHand').textContent='Made hand: —'; $('simCount').textContent='Simulations: —'; setStatus('Select cards and click Calculate Odds.'); };
$('gameMode').onchange=()=>{ if(state.hero.length>maxHero()) state.hero=state.hero.slice(0,maxHero()); render(); };
renderWildRanks(); render();
