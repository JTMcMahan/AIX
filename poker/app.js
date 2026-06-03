const state = { dest:'hole', hole:[], flop:[], turn:[], river:[], wild:[] };
const $ = id => document.getElementById(id);
function allSelected(){ return [...state.hole,...state.flop,...state.turn,...state.river]; }
function boardCards(){ return [...state.flop,...state.turn,...state.river]; }
function renderSlots(id, cards, max){
  const el=$(id); el.innerHTML='';
  cards.forEach(c=>{ const d=document.createElement('div'); d.className='card '+(/[hd]$/.test(c)?'red':''); d.textContent=PokerEngine.cardLabel(c); d.title='Click to remove'; d.onclick=()=>removeCard(c); el.appendChild(d); });
  for(let i=cards.length;i<max;i++){ const d=document.createElement('div'); d.className='card disabled'; d.textContent='+'; el.appendChild(d); }
}
function renderDeck(){
  const used=new Set(allSelected()); const deck=$('deck'); deck.innerHTML='';
  PokerEngine.makeDeck().forEach(c=>{ const d=document.createElement('div'); const isRed=/[hd]$/.test(c); const disabled=used.has(c); const wild=state.wild.includes(c); d.className='card '+(isRed?'red ':'')+(disabled?'disabled ':'')+(wild?'selected ':''); d.textContent=PokerEngine.cardLabel(c); d.onclick=()=>!disabled && addCard(c); deck.appendChild(d); });
}
function maxFor(dest){ const mode=$('gameMode').value; if(dest==='hole') return PokerEngine.requiredHole(mode); if(dest==='flop') return 3; if(dest==='turn'||dest==='river') return 1; return 52; }
function arrFor(dest){ return state[dest]; }
function addCard(c){
  const arr=arrFor(state.dest);
  if(state.dest==='wild') { const idx=arr.indexOf(c); if(idx>=0) arr.splice(idx,1); else arr.push(c); }
  else if(arr.length < maxFor(state.dest) && !allSelected().includes(c)) arr.push(c);
  render();
}
function removeCard(c){ ['hole','flop','turn','river','wild'].forEach(k=>{ const i=state[k].indexOf(c); if(i>=0) state[k].splice(i,1); }); render(); }
function render(){
  const mode=$('gameMode').value;
  $('holeHelp').textContent = `Choose exactly ${PokerEngine.requiredHole(mode)} pocket cards for this game.`;
  renderSlots('holeCards', state.hole, PokerEngine.requiredHole(mode));
  renderSlots('flopCards', state.flop, 3); renderSlots('turnCards', state.turn, 1); renderSlots('riverCards', state.river, 1);
  const wildEl=$('wildCards'); wildEl.innerHTML=''; state.wild.forEach(c=>{ const d=document.createElement('div'); d.className='card '+(/[hd]$/.test(c)?'red':''); d.textContent=PokerEngine.cardLabel(c); d.onclick=()=>removeCard(c); wildEl.appendChild(d); });
  renderDeck();
}
function setStatus(msg){ $('status').textContent=msg; }
function pct(n){ return n.toFixed(1)+'%'; }
function calculate(){
  try{
    setStatus('Running...');
    setTimeout(()=>{
      try{
        const wildRanks=[...document.querySelectorAll('[data-wild-rank].active')].map(b=>b.dataset.wildRank);
        const res=PokerEngine.runSimulation({mode:$('gameMode').value, heroCards:state.hole, boardCards:boardCards(), players:+$('players').value, iterations:+$('simulations').value, wildRanks, wildSpecific:state.wild});
        $('winPct').textContent=pct(res.winPct); $('tiePct').textContent=pct(res.tiePct); $('losePct').textContent=pct(res.losePct); $('handNow').textContent=res.heroNow;
        $('note').textContent=`Ran ${res.iterations.toLocaleString()} simulations. These are estimates, not exact enumerations.`;
        setStatus('Complete');
      }catch(e){ setStatus('Error'); alert(e.message); }
    },30);
  }catch(e){ setStatus('Error'); alert(e.message); }
}
document.querySelectorAll('.dest').forEach(b=>b.onclick=()=>{ document.querySelectorAll('.dest').forEach(x=>x.classList.remove('active')); b.classList.add('active'); state.dest=b.dataset.dest; });
document.querySelectorAll('[data-wild-rank]').forEach(b=>b.onclick=()=>b.classList.toggle('active'));
$('clearWild').onclick=()=>{ state.wild=[]; document.querySelectorAll('[data-wild-rank]').forEach(b=>b.classList.remove('active')); render(); };
$('clearAll').onclick=()=>{ state.hole=[]; state.flop=[]; state.turn=[]; state.river=[]; state.wild=[]; ['winPct','tiePct','losePct','handNow'].forEach(id=>$(id).textContent='--'); $('note').textContent='Monte Carlo estimates improve as simulations increase. Wild-card hands are evaluated by trying reasonable replacements.'; setStatus('Ready'); render(); };
$('calculate').onclick=calculate;
$('gameMode').onchange=()=>{ state.hole=state.hole.slice(0,PokerEngine.requiredHole($('gameMode').value)); render(); };
render();

