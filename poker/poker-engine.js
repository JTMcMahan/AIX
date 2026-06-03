(function(){
  const SUITS = ['s','h','d','c'];
  const SUIT_SYMBOLS = {s:'♠', h:'♥', d:'♦', c:'♣'};
  const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const RANK_VALUE = Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));
  const HAND_NAMES = ['High Card','Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Five of a Kind'];

  function makeDeck(){ return RANKS.flatMap(r => SUITS.map(s => r+s)); }
  function cardLabel(c){ return c ? c[0] + SUIT_SYMBOLS[c[1]] : ''; }
  function rankOf(c){ return c[0]; }
  function suitOf(c){ return c[1]; }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function combos(arr,k){ const out=[]; function rec(start,c){ if(c.length===k){out.push(c.slice()); return;} for(let i=start;i<arr.length-(k-c.length)+1;i++){ c.push(arr[i]); rec(i+1,c); c.pop(); }} rec(0,[]); return out; }
  function compareScore(a,b){ for(let i=0;i<Math.max(a.length,b.length);i++){ const av=a[i]||0, bv=b[i]||0; if(av>bv) return 1; if(av<bv) return -1; } return 0; }
  function bestScore(scores){ return scores.reduce((best,s)=> compareScore(s,best)>0 ? s : best, scores[0]); }
  function straightHigh(vals){
    let u=[...new Set(vals)].sort((a,b)=>b-a);
    if(u.includes(14)) u.push(1);
    let run=1;
    for(let i=1;i<u.length;i++){ if(u[i]===u[i-1]-1){ run++; if(run>=5) return u[i-4]; } else if(u[i]!==u[i-1]) run=1; }
    return 0;
  }
  function scoreFive(cards){
    const vals=cards.map(c=>RANK_VALUE[rankOf(c)]).sort((a,b)=>b-a);
    const flush=cards.every(c=>suitOf(c)===suitOf(cards[0]));
    const straight=straightHigh(vals);
    const counts={}; vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups=Object.entries(counts).map(([v,c])=>({v:+v,c})).sort((a,b)=> b.c-a.c || b.v-a.v);
    if(groups[0].c===5) return [9, groups[0].v];
    if(straight && flush) return [8, straight];
    if(groups[0].c===4) return [7, groups[0].v, groups.find(g=>g.c===1).v];
    if(groups[0].c===3 && groups[1] && groups[1].c===2) return [6, groups[0].v, groups[1].v];
    if(flush) return [5, ...vals];
    if(straight) return [4, straight];
    if(groups[0].c===3) return [3, groups[0].v, ...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    const pairs=groups.filter(g=>g.c===2).map(g=>g.v).sort((a,b)=>b-a);
    if(pairs.length>=2) return [2, pairs[0], pairs[1], groups.find(g=>g.c===1).v];
    if(pairs.length===1) return [1, pairs[0], ...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    return [0, ...vals];
  }
  function expandWildFive(cards, wildSet, wildRanks, wildSpecific){
    const nonWild=[]; let wildCount=0;
    for(const c of cards){
      if(wildSet.has(c) || wildRanks.has(rankOf(c)) || wildSpecific.has(c)) wildCount++;
      else nonWild.push(c);
    }
    if(wildCount===0) return scoreFive(cards);
    const replacementDeck=makeDeck();
    let best=null;
    function rec(current, n){
      if(n===0){ const s=scoreFive(nonWild.concat(current)); if(!best || compareScore(s,best)>0) best=s; return; }
      for(const c of replacementDeck){ current.push(c); rec(current,n-1); current.pop(); }
    }
    rec([], wildCount);
    return best;
  }
  function describeScore(score){ return HAND_NAMES[score[0]] || 'Unknown'; }
  function evaluateTexas(hole, board, wildRanks=[], wildSpecific=[]){
    const wildSet=new Set(); const wr=new Set(wildRanks), ws=new Set(wildSpecific);
    return bestScore(combos(hole.concat(board),5).map(c=>expandWildFive(c,wildSet,wr,ws)));
  }
  function evaluateOmaha(hole, board, wildRanks=[], wildSpecific=[]){
    const wr=new Set(wildRanks), ws=new Set(wildSpecific);
    const scores=[];
    for(const h of combos(hole,2)) for(const b of combos(board,3)) scores.push(expandWildFive(h.concat(b),new Set(),wr,ws));
    return bestScore(scores);
  }
  function evaluateHand(mode,hole,board,wildRanks=[],wildSpecific=[]){
    if(mode==='holdem') return evaluateTexas(hole,board,wildRanks,wildSpecific);
    return evaluateOmaha(hole,board,wildRanks,wildSpecific);
  }
  function requiredHole(mode){ return mode==='holdem' ? 2 : (mode==='omaha3' ? 3 : 4); }
  function runSimulation(opts){
    const {mode, heroCards, boardCards, players, iterations=5000, wildRanks=[], wildSpecific=[]} = opts;
    const needed=requiredHole(mode);
    if(heroCards.length!==needed) throw new Error(`Select exactly ${needed} pocket cards.`);
    if(players<2 || players>10) throw new Error('Players must be between 2 and 10.');
    if(boardCards.length>5) throw new Error('Board cannot exceed 5 cards.');
    if(mode!=='holdem' && boardCards.length>0 && boardCards.length<3) throw new Error('Omaha needs flop cards before calculating board odds.');
    const known=new Set([...heroCards, ...boardCards]);
    if(known.size !== heroCards.length + boardCards.length) throw new Error('A card was selected more than once.');
    let wins=0,ties=0,losses=0;
    const oppHoleCount = mode==='holdem' ? 2 : requiredHole(mode);
    const heroNow = boardCards.length===5 ? describeScore(evaluateHand(mode,heroCards,boardCards,wildRanks,wildSpecific)) : 'Pending';
    for(let i=0;i<iterations;i++){
      let deck=shuffle(makeDeck().filter(c=>!known.has(c)));
      const needBoard=5-boardCards.length;
      const board=boardCards.concat(deck.splice(0,needBoard));
      const hero=evaluateHand(mode,heroCards,board,wildRanks,wildSpecific);
      let bestOpp=null;
      for(let p=1;p<players;p++){
        const opp=deck.splice(0,oppHoleCount);
        const score=evaluateHand(mode,opp,board,wildRanks,wildSpecific);
        if(!bestOpp || compareScore(score,bestOpp)>0) bestOpp=score;
      }
      const cmp=compareScore(hero,bestOpp);
      if(cmp>0) wins++; else if(cmp<0) losses++; else ties++;
    }
    return {iterations,wins,ties,losses,winPct:wins/iterations*100,tiePct:ties/iterations*100,losePct:losses/iterations*100,heroNow};
  }
  window.PokerEngine={SUITS,SUIT_SYMBOLS,RANKS,makeDeck,cardLabel,requiredHole,runSimulation,describeScore,evaluateHand};
})();
