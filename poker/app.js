document.addEventListener("DOMContentLoaded", () => {
  const state = {
    destination: "pocket",
    pocket: [],
    flop: [],
    turn: [],
    river: [],
    wild: []
  };

  const $ = (id) => document.getElementById(id);
  const gameSelect = $("gameSelect");
  const playersInput = $("playersInput");
  const deckGrid = $("deckGrid");
  const calculateBtn = $("calculateBtn");
  const clearAllBtn = $("clearAllBtn");
  const clearWildsBtn = $("clearWildsBtn");
  const statusText = $("statusText");

  function isRed(card){ return card[1] === "h" || card[1] === "d"; }
  function boardCards(){ return [...state.flop, ...state.turn, ...state.river]; }
  function usedCards(){ return new Set([...state.pocket, ...boardCards()]); }

  function zoneLimit(dest){
    if(dest==="pocket") return PokerEngine.requiredHole(gameSelect.value);
    if(dest==="flop") return 3;
    if(dest==="turn") return 1;
    if(dest==="river") return 1;
    return 52;
  }

  function getZoneArray(dest){ return state[dest]; }

  function setHelp(){
    const needed = PokerEngine.requiredHole(gameSelect.value);
    const label = gameSelect.value === "holdem" ? "Texas Hold'em" : (gameSelect.value === "omaha3" ? "3-card Omaha" : "4-card Omaha");
    $("pocketHelp").textContent = `Choose exactly ${needed} pocket cards for ${label}.`;
  }

  function renderSelected(zoneId, arr){
    const zone = $(zoneId);
    zone.innerHTML = "";
    arr.forEach(card => {
      const el = document.createElement("button");
      el.className = `selected-card ${isRed(card) ? "red" : ""} ${state.wild.includes(card) ? "wild-card" : ""}`;
      el.textContent = PokerEngine.cardLabel(card);
      el.title = "Click to remove";
      el.addEventListener("click", () => {
        const idx = arr.indexOf(card);
        if(idx >= 0) arr.splice(idx,1);
        render();
      });
      zone.appendChild(el);
    });
  }

  function renderDeck(){
    const used = usedCards();
    deckGrid.innerHTML = "";
    PokerEngine.makeDeck().forEach(card => {
      const btn = document.createElement("button");
      btn.className = `card-btn ${isRed(card) ? "red" : ""} ${used.has(card) ? "used" : ""} ${state.wild.includes(card) ? "wild-card" : ""}`;
      btn.textContent = PokerEngine.cardLabel(card);
      btn.disabled = used.has(card) && state.destination !== "wild";
      btn.addEventListener("click", () => chooseCard(card));
      deckGrid.appendChild(btn);
    });
  }

  function chooseCard(card){
    const dest = state.destination;
    const arr = getZoneArray(dest);

    if(dest === "wild"){
      const idx = arr.indexOf(card);
      if(idx >= 0) arr.splice(idx,1);
      else arr.push(card);
      render();
      return;
    }

    if(usedCards().has(card)) return;
    const limit = zoneLimit(dest);
    if(arr.length >= limit) arr.shift();
    arr.push(card);
    render();
  }

  function render(){
    setHelp();
    renderSelected("pocketZone", state.pocket);
    renderSelected("flopZone", state.flop);
    renderSelected("turnZone", state.turn);
    renderSelected("riverZone", state.river);
    renderSelected("wildZone", state.wild);
    renderDeck();

    document.querySelectorAll(".dest").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.dest === state.destination);
      btn.disabled =
        (btn.dataset.dest === "flop" && state.pocket.length < PokerEngine.requiredHole(gameSelect.value)) ||
        (btn.dataset.dest === "turn" && state.flop.length < 3) ||
        (btn.dataset.dest === "river" && state.turn.length < 1);
    });
  }

  function setStatus(text, busy=false){
    statusText.textContent = text;
    calculateBtn.disabled = busy;
  }

  function calculate(){
    try{
      setStatus("Running...", true);
      $("winPct").textContent = "--";
      $("tiePct").textContent = "--";
      $("losePct").textContent = "--";
      $("handNow").textContent = "--";

      setTimeout(() => {
        try{
          const wildRanks = [];
          const result = PokerEngine.runSimulation({
            mode: gameSelect.value,
            heroCards: [...state.pocket],
            boardCards: boardCards(),
            players: Number(playersInput.value),
            iterations: 1000,
            wildRanks,
            wildSpecific: [...state.wild]
          });

          $("winPct").textContent = result.winPct.toFixed(1) + "%";
          $("tiePct").textContent = result.tiePct.toFixed(1) + "%";
          $("losePct").textContent = result.losePct.toFixed(1) + "%";
          $("handNow").textContent = result.heroNow;
          setStatus("Ready", false);
        } catch(err){
          setStatus("Ready", false);
          alert(err.message || String(err));
        }
      }, 20);
    } catch(err){
      setStatus("Ready", false);
      alert(err.message || String(err));
    }
  }

  function clearAll(){
    state.pocket = [];
    state.flop = [];
    state.turn = [];
    state.river = [];
    state.wild = [];
    $("winPct").textContent = "--";
    $("tiePct").textContent = "--";
    $("losePct").textContent = "--";
    $("handNow").textContent = "--";
    setStatus("Ready", false);
    render();
  }

  document.querySelectorAll(".dest").forEach(btn => {
    btn.addEventListener("click", () => {
      state.destination = btn.dataset.dest;
      render();
    });
  });

  document.querySelectorAll("[data-wild-rank]").forEach(btn => {
    btn.addEventListener("click", () => {
      const rank = btn.dataset.wildRank;
      const all = PokerEngine.makeDeck().filter(c => c[0] === rank);
      all.forEach(c => { if(!state.wild.includes(c)) state.wild.push(c); });
      render();
    });
  });

  calculateBtn.addEventListener("click", calculate);
  clearAllBtn.addEventListener("click", clearAll);
  clearWildsBtn.addEventListener("click", () => { state.wild = []; render(); });
  gameSelect.addEventListener("change", () => {
    state.pocket = [];
    clearAll();
  });

  render();
});
