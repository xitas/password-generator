(function () {
  'use strict';

  /* ---------- Data ---------- */
  const SETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789'
  };
  const LOOKALIKES = /[Il1O0]/g;
  const GUESSES_PER_SECOND = 1e10; // an attacker with fast hardware and a leaked hash

  const WORDS = Array.from(new Set((
    'able acid acorn actor adult agent agree ahead album alert alley allow alone amber ample angle ankle apple april arena arrow aside atlas attic audio avoid awake axis ' +
    'bacon badge baker basic basin batch beach beard beast begin below bench berry bike birch black blade blank blast blaze blend bless blind block bloom board boast bonus boost booth brain brake brave bread brick bride brief bring broad broom brown brush bucket buddy build bunch ' +
    'cabin cable cactus camel candy canoe canyon cargo carpet carry carve castle cedar chain chair chalk charm chart chase cheek cheer chess chief child chill choir chord cider cigar civic claim clash class clean clear clerk click cliff climb clock cloud clover coach coast cobra cocoa comet coral couch count court cover crane crash crawl cream creek crest crisp cross crowd crown crumb cubic curve cycle ' +
    'daily daisy dance dealt delta dense depth diary diner disco ditch diver dizzy dodge doll donor dragon drama dream dress drift drink drive drum dusty eager eagle early earth easel eight elbow elder elite ember empty enjoy enter entry equal error essay event every exact extra ' +
    'fable fairy faith false fancy feast fence ferry fever field fifth fifty fiber flame flash fleet flint float flock flood floor flour fluid flute focus foggy forest forge forth frame fresh frost fruit funny garden gavel gentle giant ginger glade glass gleam globe glory glove goose grace grain grand grape grass gravel green grill grove guard guest guide ' +
    'habit hammer happy harbor hasty hatch haven hazel heart heavy hedge hello hence herbs hobby holly honey honor horse hotel house hover human humor hurry hyena icing ideal igloo image index inlet input ionic ivory jacket jelly jewel joker jolly judge juice jumbo jungle keeper kettle kayak kiosk kitten knack kneel knife knock koala ' +
    'label ladder lagoon lake lance large laser later laugh lawn layer leader leaf learn lemon level lever light lilac limit linen lion liver lobby local lodge logic lotus loyal lucky lunar lunch lyric magic major maple march marsh mason match meadow medal melon mercy merry metal meter might mimic minor mint mirror model moist money month moose moral motor mount mouse movie muddy music ' +
    'naval nerve never newly noble noise north novel nurse nutty oasis ocean olive onion opera orbit orchid order otter outer oxide ozone paddle paint panda panel paper parade party pasta patch pause peach pearl pedal pepper petal piano pilot pinch pixel pizza plain plane plant plaza plush poem point polar pond pony poppy porch pouch power prank press pride prime print prism prize proof proud pulse pupil puppy puzzle ' +
    'quail queen quest quick quiet quilt quote rabbit radar radio rainy raise rally ranch range rapid raven razor ready realm rebel relax reply rhyme ridge rifle right rigid river roast robin robot rocky rodeo roman rough round route royal rugby ruler rural ' +
    'saddle safari sage sail salad salmon salon sandy sauce scale scarf scene scoop scout screw seal season seed senior shade shake shape share sharp sheep shelf shell shine shirt shock shore short shrub sight signal silver simple sketch skill skirt slate sleep slice slide small smart smile smoke snack snail snake solar solid sonic sound south space spare spark speed spice spike spine spoon sport spray squad stable stack staff stage stamp stand star start state steam steel stick still stone storm story stove straw stream street stripe strong sugar summer sunny super surf swan sweet swift swing sword ' +
    'table tango tapir teach tempo tenor thank theme thick thorn three thumb tiger timber toast token tonic topaz torch total touch tower trace track trade trail train trend trial tribe trick truck trust tulip tunnel turbo twist ultra uncle under union unity upper urban usher usual valid valley value vapor velvet vendor venue verse video vigor villa vine violet viper vital vivid vocal voice voter ' +
    'wagon waist walnut waltz water wheat wheel whale whisk whole widow width wind winter wisdom witty wizard wolf world wrist yacht yeast yellow young youth zebra zesty zinc zone'
  ).split(/\s+/).filter(Boolean)));

  /* ---------- Secure randomness ---------- */
  /* Uniform integer in [0, max) from crypto.getRandomValues, without modulo bias. */
  function randInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- Elements ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    modePassword: $('modePassword'), modePassphrase: $('modePassphrase'),
    output: $('output'), generate: $('generate'), copy: $('copy'), toggle: $('toggle'), copyNote: $('copyNote'),
    strength: document.querySelector('.strength'), meterFill: $('meterFill'), strengthLabel: $('strengthLabel'), bits: $('bits'), crack: $('crack'),
    passwordOpts: $('passwordOpts'), passphraseOpts: $('passphraseOpts'),
    length: $('length'), lengthNum: $('lengthNum'), lengthOut: $('lengthOut'),
    upper: $('upper'), lower: $('lower'), digits: $('digits'), symbols: $('symbols'), symbolChars: $('symbolChars'), ambiguous: $('ambiguous'), optsNote: $('optsNote'),
    words: $('words'), wordsOut: $('wordsOut'), sep: $('sep'), cap: $('cap'), num: $('num'), wordlistNote: $('wordlistNote')
  };

  let mode = 'password';
  let current = '';   // the real value, never saved anywhere
  let hidden = false;

  /* ---------- Settings (saved without the password itself) ---------- */
  const KEY = 'password-generator';
  const FIELDS = ['length', 'upper', 'lower', 'digits', 'symbols', 'symbolChars', 'ambiguous', 'words', 'sep', 'cap', 'num'];

  function saveSettings() {
    try {
      const data = { mode };
      FIELDS.forEach((k) => { data[k] = el[k].type === 'checkbox' ? el[k].checked : el[k].value; });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* storage not available */ }
  }

  function loadSettings() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignore */ }
    if (!data) return;
    FIELDS.forEach((k) => {
      if (!(k in data)) return;
      if (el[k].type === 'checkbox') el[k].checked = !!data[k];
      else el[k].value = data[k];
    });
    if (data.mode === 'passphrase') mode = 'passphrase';
    el.lengthNum.value = el.length.value;
  }

  /* ---------- Generation ---------- */
  function symbolPool() {
    return Array.from(new Set(Array.from(el.symbolChars.value.replace(/\s/g, ''))));
  }

  function buildPools() {
    const pools = [];
    if (el.upper.checked) pools.push(Array.from(SETS.upper));
    if (el.lower.checked) pools.push(Array.from(SETS.lower));
    if (el.digits.checked) pools.push(Array.from(SETS.digits));
    if (el.symbols.checked) pools.push(symbolPool());
    return pools
      .map((p) => (el.ambiguous.checked ? p.filter((c) => !c.match(LOOKALIKES)) : p))
      .filter((p) => p.length > 0);
  }

  /* One character from every chosen type, the rest from all of them, then shuffled. */
  function makePassword(length, pools) {
    const all = [].concat(...pools);
    const chars = pools.map((p) => p[randInt(p.length)]);
    while (chars.length < length) chars.push(all[randInt(all.length)]);
    return shuffle(chars).join('');
  }

  function makePassphrase(count, sep, capitalize, withNumber) {
    const picked = [];
    for (let i = 0; i < count; i++) {
      let w = WORDS[randInt(WORDS.length)];
      if (capitalize) w = w.charAt(0).toUpperCase() + w.slice(1);
      picked.push(w);
    }
    if (withNumber) picked.push(String(randInt(100)));
    return picked.join(sep);
  }

  /* Estimated entropy in bits for the current settings. */
  function entropyBits(pools) {
    if (mode === 'passphrase') {
      let bits = Number(el.words.value) * Math.log2(WORDS.length);
      if (el.num.checked) bits += Math.log2(100);
      return bits;
    }
    const size = new Set([].concat(...pools)).size;
    return size > 1 ? Number(el.length.value) * Math.log2(size) : 0;
  }

  /* ---------- Strength text ---------- */
  const LEVELS = [
    { max: 28, label: 'Very weak' },
    { max: 40, label: 'Weak' },
    { max: 60, label: 'Fair' },
    { max: 80, label: 'Good' },
    { max: 100, label: 'Strong' },
    { max: Infinity, label: 'Excellent' }
  ];

  function describeTime(bits) {
    const seconds = Math.pow(2, bits - 1) / GUESSES_PER_SECOND; // on average half the space is searched
    if (seconds < 1) return 'less than a second';
    if (seconds < 60) return Math.round(seconds) + ' seconds';
    if (seconds < 3600) return Math.round(seconds / 60) + ' minutes';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hours';
    const years = seconds / 31557600;
    if (years < 1) return Math.round(seconds / 86400) + ' days';
    if (years < 1000) return Math.round(years).toLocaleString() + ' years';
    if (years < 1e6) return Math.round(years / 1e3).toLocaleString() + ' thousand years';
    if (years < 1e9) return Math.round(years / 1e6).toLocaleString() + ' million years';
    if (years < 1e12) return Math.round(years / 1e9).toLocaleString() + ' billion years';
    return 'trillions of years or more';
  }

  function renderStrength(bits) {
    const level = LEVELS.findIndex((l) => bits < l.max);
    el.strength.dataset.level = String(level);
    el.strengthLabel.textContent = LEVELS[level].label;
    el.bits.textContent = Math.round(bits) + ' bits of entropy';
    el.meterFill.style.width = Math.min(bits / 128, 1) * 100 + '%';
    el.crack.textContent = 'Time to crack: about ' + describeTime(bits) + ', at 10 billion guesses per second.';
  }

  /* ---------- Rendering ---------- */
  function renderOutput() {
    el.output.textContent = '';
    if (!current) return;
    if (hidden) {
      el.output.textContent = '•'.repeat(Array.from(current).length);
      return;
    }
    Array.from(current).forEach((ch) => {
      if (/[A-Za-z]/.test(ch)) {
        el.output.appendChild(document.createTextNode(ch));
      } else {
        const span = document.createElement('span');
        span.className = /[0-9]/.test(ch) ? 'd' : 's';
        span.textContent = ch;
        el.output.appendChild(span);
      }
    });
  }

  function showPlaceholder(text) {
    current = '';
    el.output.innerHTML = '';
    const p = document.createElement('span');
    p.className = 'ph';
    p.textContent = text;
    el.output.appendChild(p);
    el.copy.disabled = true;
    el.generate.disabled = true;
    el.strength.dataset.level = '0';
    el.strengthLabel.textContent = '—';
    el.bits.textContent = '';
    el.meterFill.style.width = '0';
    el.crack.textContent = '';
  }

  function generate() {
    el.copyNote.textContent = '';
    el.optsNote.hidden = true;
    let bits;

    if (mode === 'password') {
      el.lengthOut.textContent = el.length.value;
      const pools = buildPools();

      if (el.symbols.checked && symbolPool().length === 0) {
        el.optsNote.textContent = 'Enter at least one symbol, or turn Symbols off.';
        el.optsNote.hidden = false;
      }
      if (pools.length === 0) {
        showPlaceholder('Choose at least one character type.');
        return;
      }
      current = makePassword(Number(el.length.value), pools);
      bits = entropyBits(pools);
    } else {
      el.wordsOut.textContent = el.words.value;
      current = makePassphrase(Number(el.words.value), el.sep.value, el.cap.checked, el.num.checked);
      bits = entropyBits([]);
    }

    el.copy.disabled = false;
    el.generate.disabled = false;
    renderOutput();
    renderStrength(bits);
  }

  function setMode(next) {
    mode = next;
    el.modePassword.setAttribute('aria-pressed', String(next === 'password'));
    el.modePassphrase.setAttribute('aria-pressed', String(next === 'passphrase'));
    el.passwordOpts.hidden = next !== 'password';
    el.passphraseOpts.hidden = next !== 'passphrase';
    el.output.setAttribute('aria-label', next === 'password' ? 'Generated password' : 'Generated passphrase');
    generate();
    saveSettings();
  }

  /* ---------- Events ---------- */
  el.modePassword.addEventListener('click', () => setMode('password'));
  el.modePassphrase.addEventListener('click', () => setMode('passphrase'));
  el.generate.addEventListener('click', generate);

  const clampLength = (v) => Math.min(64, Math.max(8, Math.round(Number(v)) || 8));

  el.length.addEventListener('input', () => {
    el.lengthNum.value = el.length.value;
    generate();
    saveSettings();
  });
  el.lengthNum.addEventListener('input', () => {
    const n = Number(el.lengthNum.value);
    if (n >= 8 && n <= 64) {
      el.length.value = String(Math.round(n));
      generate();
      saveSettings();
    }
  });
  el.lengthNum.addEventListener('change', () => {
    el.lengthNum.value = String(clampLength(el.lengthNum.value));
    el.length.value = el.lengthNum.value;
    generate();
    saveSettings();
  });

  ['upper', 'lower', 'digits', 'symbols', 'symbolChars', 'ambiguous', 'words', 'sep', 'cap', 'num'].forEach((k) => {
    el[k].addEventListener('input', () => { generate(); saveSettings(); });
    el[k].addEventListener('change', () => { generate(); saveSettings(); });
  });

  el.toggle.addEventListener('click', () => {
    hidden = !hidden;
    el.toggle.setAttribute('aria-pressed', String(hidden));
    el.toggle.textContent = hidden ? 'Show' : 'Hide';
    renderOutput();
  });

  el.copy.addEventListener('click', () => {
    if (!current) return;
    const done = () => {
      el.copyNote.textContent = 'Copied to clipboard';
      el.copy.textContent = 'Copied';
      setTimeout(() => { el.copy.textContent = 'Copy'; el.copyNote.textContent = ''; }, 1800);
    };
    const fallback = () => {
      if (hidden) el.toggle.click();
      const range = document.createRange();
      range.selectNodeContents(el.output);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      el.copyNote.textContent = 'Press Ctrl/Cmd + C to copy';
    };
    try {
      navigator.clipboard.writeText(current).then(done, fallback);
    } catch (e) { fallback(); }
  });

  /* ---------- Start ---------- */
  loadSettings();
  el.wordlistNote.textContent = 'Words are picked at random from a list of ' + WORDS.length + ' (about ' + Math.log2(WORDS.length).toFixed(1) + ' bits per word). Use 6 or more words for important accounts.';
  setMode(mode);
})();
