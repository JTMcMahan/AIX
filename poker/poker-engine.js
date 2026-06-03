(function(root){
  const SUITS=["s","h","d","c"];
  const SUIT_SYMBOLS={s:"♠",h:"♥",d:"♦",c:"♣"};
  const RANKS=["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
  const RANK_VALUE=Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));
  const HAND_NAMES=["High Card","Pair","Two Pair","Three of a Kind","Straight","Flush","Full House","Four of a Kind","Straight Flush","Five of a Kind"];

  function makeDeck(){return RANKS.flatMap(r=>SUITS.map(s=>r+s));}
  function cardLabel(c){return c[0]+SUIT_SYMBOLS[c[1]];}
  function rankOf(c){return c[0];}
  function suitOf(c){return c[1];}
  function requiredHole(mode){return mode==="holdem"?2:(mode==="omaha3"?3:4);}

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  function combinations(arr,k){
    const out=[];
    function rec(start,combo){
      if(combo.length===k){out.push(combo.slice());return;}
      for(let i=start;i<=arr.length-(k-combo.length);i++){combo.push(arr[i]);rec(i+1,combo);combo.pop();}
    }
    rec(0,[]);
    return out;
  }

  function compareScore(a,b){
    for(let i=0;i<Math.max(a.length,b.length);i++){
      const av=a[i]||0,bv=b[i]||0;
      if(av>bv)return 1;
      if(av<bv)return -1;
    }
    return 0;
  }

  function bestScore(scores){let best=scores[0];for(const s of scores.slice(1))if(compareScore(s,best)>0)best=s;return best;}

  const STRAIGHTS=[
    [14,13,12,11,10],[13,12,11,10,9],[12,11,10,9,8],[11,10,9,8,7],[10,9,8,7,6],
    [9,8,7,6,5],[8,7,6,5,4],[7,6,5,4,3],[6,5,4,3,2],[5,4,3,2,14]
  ];

  function straightHighFromSet(set,wilds){
    for(const seq of STRAIGHTS){
      let missing=0;
      for(const v of seq)if(!set.has(v))missing++;
      if(missing<=wilds)return seq[0];
    }
    return 0;
  }

  function topKickers(counts,exclude,wilds,need){
    const out=[], ex=new Set(exclude||[]);
    for(let v=14;v>=2&&out.length<need;v--){
      if(ex.has(v))continue;
      for(let i=0;i<(counts[v]||0)&&out.length<need;i++)out.push(v);
    }
    for(let v=14;v>=2&&out.length<need&&wilds>0;v--){
      if(ex.has(v))continue;
      out.push(v);wilds--;
      if(v===2&&out.length<need&&wilds>0)v=15;
    }
    while(out.length<need)out.push(0);
    return out;
  }

  function scoreNatural(cards){
    const vals=cards.map(c=>RANK_VALUE[rankOf(c)]).sort((a,b)=>b-a);
    const flush=cards.every(c=>suitOf(c)===suitOf(cards[0]));
    const straight=straightHighFromSet(new Set(vals),0);
    const counts={};
    vals.forEach(v=>counts[v]=(counts[v]||0)+1);
    const groups=Object.entries(counts).map(([v,c])=>({v:+v,c})).sort((a,b)=>b.c-a.c||b.v-a.v);
    if(groups[0].c===5)return[9,groups[0].v];
    if(straight&&flush)return[8,straight];
    if(groups[0].c===4)return[7,groups[0].v,groups.find(g=>g.c===1)?.v||0];
    if(groups[0].c===3&&groups[1]?.c===2)return[6,groups[0].v,groups[1].v];
    if(flush)return[5,...vals];
    if(straight)return[4,straight];
    if(groups[0].c===3)return[3,groups[0].v,...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    const pairs=groups.filter(g=>g.c===2).map(g=>g.v).sort((a,b)=>b-a);
    if(pairs.length>=2)return[2,pairs[0],pairs[1],...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    if(pairs.length===1)return[1,pairs[0],...groups.filter(g=>g.c===1).map(g=>g.v).sort((a,b)=>b-a)];
    return[0,...vals];
  }

  function scoreWithWilds(cards,wildRanks,wildSpecific){
    const non=[];let w=0;
    for(const c of cards){
      if(wildSpecific.has(c)||wildRanks.has(rankOf(c)))w++;
      else non.push(c);
    }
    if(w===0)return scoreNatural(cards);

    const counts={}, suitCounts={s:{},h:{},d:{},c:{}}, suitTotals={s:0,h:0,d:0,c:0}, valueSet=new Set();
    for(const c of non){
      const v=RANK_VALUE[rankOf(c)], s=suitOf(c);
      counts[v]=(counts[v]||0)+1;
      suitCounts[s][v]=(suitCounts[s][v]||0)+1;
      suitTotals[s]++;
      valueSet.add(v);
    }

    for(let v=14;v>=2;v--)if((counts[v]||0)+w>=5)return[9,v];

    for(const s of SUITS){
      const suitedSet=new Set(Object.keys(suitCounts[s]).map(Number));
      for(const seq of STRAIGHTS){
        let miss=0;
        for(const v of seq)if(!suitedSet.has(v))miss++;
        if(miss<=w)return[8,seq[0]];
      }
    }

    for(let v=14;v>=2;v--){
      const need=Math.max(0,4-(counts[v]||0));
      if(need<=w)return[7,v,topKickers(counts,[v],w-need,1)[0]];
    }

    let full=null;
    for(let t=14;t>=2;t--)for(let p=14;p>=2;p--){
      if(p===t)continue;
      const need=Math.max(0,3-(counts[t]||0))+Math.max(0,2-(counts[p]||0));
      if(need<=w){const cand=[6,t,p];if(!full||compareScore(cand,full)>0)full=cand;}
    }
    if(full)return full;

    let fl=null;
    for(const s of SUITS){
      if(suitTotals[s]+w>=5){
        const vals=[];
        for(let v=14;v>=2;v--)for(let i=0;i<(suitCounts[s][v]||0);i++)vals.push(v);
        let ww=w;
        for(let v=14;v>=2&&vals.length<5&&ww>0;v--){vals.push(v);ww--;}
        const cand=[5,...vals.slice(0,5)];
        if(!fl||compareScore(cand,fl)>0)fl=cand;
      }
    }
    if(fl)return fl;

    const st=straightHighFromSet(valueSet,w);
    if(st)return[4,st];

    for(let v=14;v>=2;v--){
      const need=Math.max(0,3-(counts[v]||0));
      if(need<=w)return[3,v,...topKickers(counts,[v],w-need,2)];
    }

    let tp=null;
    for(let a=14;a>=2;a--)for(let b=a-1;b>=2;b--){
      const need=Math.max(0,2-(counts[a]||0))+Math.max(0,2-(counts[b]||0));
      if(need<=w){const cand=[2,a,b,topKickers(counts,[a,b],w-need,1)[0]];if(!tp||compareScore(cand,tp)>0)tp=cand;}
    }
    if(tp)return tp;

    for(let v=14;v>=2;v--){
      const need=Math.max(0,2-(counts[v]||0));
      if(need<=w)return[1,v,...topKickers(counts,[v],w-need,3)];
    }

    return[0,...topKickers(counts,[],w,5)];
  }

  function describeScore(score){return HAND_NAMES[score?.[0]??0]||"Unknown";}

  function evaluateTexas(hole,board,wildRanks,wildSpecific){
    return bestScore(combinations(hole.concat(board),5).map(c=>scoreWithWilds(c,wildRanks,wildSpecific)));
  }

  function evaluateOmaha(hole,board,wildRanks,wildSpecific){
    const scores=[];
    for(const h of combinations(hole,2))for(const b of combinations(board,3))scores.push(scoreWithWilds(h.concat(b),wildRanks,wildSpecific));
    return bestScore(scores);
  }

  function evaluateHand(mode,hole,board,wildRanks,wildSpecific){
    return mode==="holdem"?evaluateTexas(hole,board,wildRanks,wildSpecific):evaluateOmaha(hole,board,wildRanks,wildSpecific);
  }

  function runSimulation(opts){
    const {mode,heroCards,boardCards,players,iterations=1000,wildRanks=[],wildSpecific=[]}=opts;
    const needed=requiredHole(mode);
    if(heroCards.length!==needed)throw new Error(`Select exactly ${needed} pocket cards.`);
    if(players<2||players>10)throw new Error("Players must be between 2 and 10.");
    if(boardCards.length>5)throw new Error("Board cannot contain more than 5 cards.");
    if(mode!=="holdem"&&boardCards.length>0&&boardCards.length<3)throw new Error("Omaha needs flop cards before calculating board odds.");
    const chosen=heroCards.concat(boardCards);
    if(new Set(chosen).size!==chosen.length)throw new Error("A card was selected more than once.");

    const wildRankSet=new Set(wildRanks), wildSpecificSet=new Set(wildSpecific);
    const activeWilds=wildRankSet.size+wildSpecificSet.size;
    const actualIterations=activeWilds?Math.min(iterations,200):iterations;

    let wins=0,ties=0,losses=0;
    const canShowHandNow =
      mode === "holdem"
        ? boardCards.length >= 3
        : boardCards.length >= 3;

    const heroNow = canShowHandNow
      ? describeScore(evaluateHand(mode, heroCards, boardCards, wildRankSet, wildSpecificSet))
      : "Pending";

    for(let i=0;i<actualIterations;i++){
      const deck=shuffle(makeDeck().filter(c=>!chosen.includes(c)));
      const board=boardCards.concat(deck.splice(0,5-boardCards.length));
      const hero=evaluateHand(mode,heroCards,board,wildRankSet,wildSpecificSet);
      let bestOpp=null;
      for(let p=1;p<players;p++){
        const opp=deck.splice(0,needed);
        const score=evaluateHand(mode,opp,board,wildRankSet,wildSpecificSet);
        if(!bestOpp||compareScore(score,bestOpp)>0)bestOpp=score;
      }
      const cmp=compareScore(hero,bestOpp);
      if(cmp>0)wins++;else if(cmp<0)losses++;else ties++;
    }

    return{iterations:actualIterations,wins,ties,losses,winPct:wins/actualIterations*100,tiePct:ties/actualIterations*100,losePct:losses/actualIterations*100,heroNow};
  }

  root.PokerEngine={SUITS,SUIT_SYMBOLS,RANKS,makeDeck,cardLabel,requiredHole,runSimulation,describeScore,evaluateHand};
})(globalThis);
