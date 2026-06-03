(function(root){
  const SUITS = ["s","h","d","c"];
  const SUIT_SYMBOLS = {s:"♠", h:"♥", d:"♦", c:"♣"};
  const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
  const RANK_VALUE = Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));
  const HAND_NAMES = ["High Card","Pair","Two Pair","Three of a Kind","Straight","Flush","Full House","Four of a Kind","Straight Flush","Five of a Kind"];

  function makeDeck(){ return RANKS.flatMap(r => SUITS.map(s => r+s)); }
  function cardLabel(c){ return c[0] + SUIT_SYMBOLS[c[1]]; }
  function rankOf(c){ return c[0]; }
  function suitOf(c){ return c[1]; }
  function requiredHole(mode){ return mode==="holdem" ? 2 : (mode==="omaha3" ? 3 : 4); }

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function combinations(arr,k){
    const out=[];
    function rec(start,combo){
      if(combo.length===k){ out.push(combo.slice()); return; }
      for(let i=start;i<=arr.length-(k-combo.length);i++){
        combo.push(arr[i]); rec(i+1,combo); combo.pop();
      }
    }
    rec(0,[]);
    return out;
  }

  function compareScore(a,b){
    for(let i=0;i<Math.max(a.length,b.length);i++){
      const av=a[i]||0,bv=b[i]||0;
      if(av>bv) return 1;
      if(av<bv) return -1;
    }
    return 0;
  }

  function bestScore(scores){
    let best=scores[0];
    for(const s of scores.slice(1)) if(compareScore(s,best)>0) best=s;
    return best;
  }

  function straightHigh(vals){
    const unique=[...new Set(vals)].sort((a,b)=>b-a);
    if(unique.includes(14)) unique.push(1);
    let run=1;
    for(let i=1;i<unique.length;i++){
      if(unique[i]===unique[i-1]-1){
        run++;
        if(run>=5) return unique[i-4];
      } else if(unique[i]!==unique[i-1]) run=1;
    }
    return 0;
  }

  function scoreFive(cards){
    const vals=cards.map(c=>RANK_VALUE[rankOf(c)]).sort((a,b)=>b-a);
    const flush=cards.every(c=>suitOf(c)===suitOf(cards[0]));
    const straight=straightHigh(vals);
    const counts={};
    vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups=Object.entries(counts).map(([v,c])=>({v:+v,c})).sort((a,b)=>b.c-a.c || b.v-a.v);

    if(groups[0].c===5) return [9,groups[0].v];
    if(straight && flush) return [8,straight];
    if(groups[0].c===4) return [7,groups[0].v, groups.find(g=>g.c===1)?.v || 0];
    if(groups[0].c===3 && groups[1]?.c===2) return [6,groups[0].v,groups[1].v];
    if(flush) return [5,...vals];
    if(straight) return [4,straight];
    if(groups[0].c===3) return [3,groups[0].v,...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    const pairs=groups.filter(g=>g.c===2).map(g=>g.v).sort((a,b)=>b-a);
    if(pairs.length>=2) return [2,pairs[0],pairs[1],...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    if(pairs.length===1) return [1,pairs[0],...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    return [0,...vals];
  }

  function hasWild(cards,wildRanks,wildSpecific){
    return cards.some(c => wildSpecific.has(c) || wildRanks.has(rankOf(c)));
  }

  // Fast practical wild estimate:
  // Instead of trying every possible replacement recursively, test a small set of high-value candidates.
  // This keeps the app responsive while still giving useful odds.
  function fastWildScoreFive(cards,wildRanks,wildSpecific){
    const nonWild=[];
    let wildCount=0;
    for(const c of cards){
      if(wildSpecific.has(c) || wildRanks.has(rankOf(c))) wildCount++;
      else nonWild.push(c);
    }
    if(wildCount===0) return scoreFive(cards);

    const candidateRanks=["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
    const candidateCards=[];
    for(const r of candidateRanks){
      for(const s of SUITS) candidateCards.push(r+s);
    }

    let best=null;
    // Limit branching: choose from 52 candidates for first wild, and a reduced smart set for additional wilds.
    const smart = candidateCards.slice(0, 24);

    function rec(current,n){
      if(n===0){
        const score=scoreFive(nonWild.concat(current));
        if(!best || compareScore(score,best)>0) best=score;
        return;
      }
      const pool = current.length === 0 ? candidateCards : smart;
      for(const c of pool){
        current.push(c);
        rec(current,n-1);
        current.pop();
      }
    }

    // Cap at 3 wild replacements for speed. Extra wilds still score very strong.
    if(wildCount >= 4) return [9,14];
    rec([], wildCount);
    return best || scoreFive(nonWild.concat(Array(wildCount).fill("As")));
  }

  function describeScore(score){
    return HAND_NAMES[score?.[0] ?? 0] || "Unknown";
  }

  function evaluateTexas(hole,board,wildRanks,wildSpecific){
    const all=hole.concat(board);
    return bestScore(combinations(all,5).map(c=>fastWildScoreFive(c,wildRanks,wildSpecific)));
  }

  function evaluateOmaha(hole,board,wildRanks,wildSpecific){
    const scores=[];
    for(const h of combinations(hole,2)){
      for(const b of combinations(board,3)){
        scores.push(fastWildScoreFive(h.concat(b),wildRanks,wildSpecific));
      }
    }
    return bestScore(scores);
  }

  function evaluateHand(mode,hole,board,wildRanks,wildSpecific){
    if(mode==="holdem") return evaluateTexas(hole,board,wildRanks,wildSpecific);
    return evaluateOmaha(hole,board,wildRanks,wildSpecific);
  }

  function runSimulation(opts){
    const {mode, heroCards, boardCards, players, iterations=1000, wildRanks=[], wildSpecific=[]} = opts;
    const neededHole=requiredHole(mode);
    if(heroCards.length!==neededHole) throw new Error(`Select exactly ${neededHole} pocket cards.`);
    if(players<2 || players>10) throw new Error("Players must be between 2 and 10.");
    if(boardCards.length>5) throw new Error("Board cannot contain more than 5 cards.");
    if(mode!=="holdem" && boardCards.length>0 && boardCards.length<3) throw new Error("Omaha needs flop cards before calculating board odds.");

    const allChosen=heroCards.concat(boardCards);
    if(new Set(allChosen).size!==allChosen.length) throw new Error("A card was selected more than once.");

    const wildRankSet=new Set(wildRanks);
    const wildSpecificSet=new Set(wildSpecific);

    // If wild cards are active, reduce iterations to keep response quick.
    const activeWilds = wildSpecificSet.size + wildRankSet.size;
    const actualIterations = activeWilds ? Math.min(iterations, 300) : iterations;

    let wins=0,ties=0,losses=0;
    const heroNow=boardCards.length===5 ? describeScore(evaluateHand(mode,heroCards,boardCards,wildRankSet,wildSpecificSet)) : "Pending";

    for(let i=0;i<actualIterations;i++){
      const deck=shuffle(makeDeck().filter(c=>!allChosen.includes(c)));
      const board=boardCards.concat(deck.splice(0,5-boardCards.length));
      const heroScore=evaluateHand(mode,heroCards,board,wildRankSet,wildSpecificSet);
      let bestOpp=null;

      for(let p=1;p<players;p++){
        const opp=deck.splice(0,neededHole);
        const score=evaluateHand(mode,opp,board,wildRankSet,wildSpecificSet);
        if(!bestOpp || compareScore(score,bestOpp)>0) bestOpp=score;
      }

      const cmp=compareScore(heroScore,bestOpp);
      if(cmp>0) wins++;
      else if(cmp<0) losses++;
      else ties++;
    }

    return {
      iterations: actualIterations,wins,ties,losses,
      winPct:wins/actualIterations*100,
      tiePct:ties/actualIterations*100,
      losePct:losses/actualIterations*100,
      heroNow
    };
  }

  root.PokerEngine={SUITS,SUIT_SYMBOLS,RANKS,makeDeck,cardLabel,requiredHole,runSimulation,describeScore,evaluateHand};
})(globalThis);
