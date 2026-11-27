import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir =
  process.env.E2E_OUT ??
  path.join(process.env.TEMP ?? '/tmp', 'cursor', 'e2e-final');
fs.mkdirSync(outDir, { recursive: true });

function sh(cmd) {
  return execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tap(x, y) {
  sh(`adb shell input tap ${x} ${y}`);
}

function sleep(sec) {
  execSync(
    process.platform === 'win32'
      ? `powershell -Command "Start-Sleep -Seconds ${sec}"`
      : `sleep ${sec}`
  );
}

function shot(name) {
  sh('adb shell screencap -p /sdcard/e2e.png');
  sh(`adb pull /sdcard/e2e.png "${path.join(outDir, name)}.png"`);
  console.log('shot', name);
}

function dumpUi(file) {
  const local = path.join(outDir, file);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.rmSync(local, { force: true });
      sh('adb shell rm -f /sdcard/ui.xml');
      sh('adb shell uiautomator dump /sdcard/ui.xml');
      sh(`adb pull /sdcard/ui.xml "${local}"`);
      return local;
    } catch {
      sleep(1);
    }
  }
  return local;
}

function parseUi(file) {
  if (!fs.existsSync(file)) return [];
  const xml = fs.readFileSync(file, 'utf8');
  const nodeRe = /<node\b[^>]*>/g;
  const hits = [];
  for (const chunk of xml.match(nodeRe) ?? []) {
    const text = chunk.match(/text="([^"]*)"/)?.[1] ?? '';
    const desc = chunk.match(/content-desc="([^"]*)"/)?.[1] ?? '';
    const pkg = chunk.match(/package="([^"]*)"/)?.[1] ?? '';
    const b = chunk.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!b) continue;
    const cx = Math.round((+b[1] + +b[3]) / 2);
    const cy = Math.round((+b[2] + +b[4]) / 2);
    if (text || desc) hits.push({ text, desc, pkg, cx, cy });
  }
  return hits;
}

function find(hits, re) {
  return hits.find((h) => re.test(`${h.text} ${h.desc}`));
}

function waitForHit(baseFile, re, maxWaitSec = 18) {
  const rounds = Math.max(1, Math.ceil(maxWaitSec / 2));
  let hits = [];
  for (let i = 0; i < rounds; i++) {
    hits = parseUi(dumpUi(baseFile));
    const hit = find(hits, re);
    if (hit) return { hit, hits };
    sleep(2);
  }
  return { hit: null, hits };
}

function assertStep(label, hits, re) {
  const hit = find(hits, re);
  if (!hit) {
    console.error(`FAIL ${label}: missing ${re}`);
    return false;
  }
  console.log(`OK ${label}: ${hit.text || hit.desc}`);
  return true;
}

console.log('outDir', outDir);
sh('adb reverse tcp:8081 tcp:8081');
sh('adb reverse tcp:3000 tcp:3000');
sh('adb reverse tcp:3001 tcp:3001');
sh('adb reverse tcp:3002 tcp:3002');
sh('adb shell am force-stop host.exp.exponent');
sleep(1);
sh('adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"');
sleep(6);

// Wait for Home feed to finish loading from skeleton
let { hits } = waitForHit('ui-home.xml', /LIVE UPLINK|Top 10 Trending|▶ Play/i, 20);
shot('home-loaded');
assertStep('home-feed', hits, /LIVE UPLINK|Top 10 Trending|▶ Play/i);

// 1. Test Theme Switcher (Obsidian <-> Luminous)
const theme = find(hits, /Switch to (dark|light) theme/i);
if (theme) {
  tap(theme.cx, theme.cy);
  sleep(2);
  hits = parseUi(dumpUi('ui-theme-luminous.xml'));
  shot('theme-luminous');
  assertStep('theme-luminous-toggled', hits, /Switch to dark theme/i);

  tap(theme.cx, theme.cy);
  sleep(2);
  hits = parseUi(dumpUi('ui-theme-obsidian.xml'));
  shot('theme-obsidian');
  assertStep('theme-obsidian-restored', hits, /Switch to light theme/i);
}

// 2. Ensure Hero is in My List (if already saved from previous run, verify or toggle)
if (!find(hits, /In My List/i)) {
  const addList = find(hits, /Add to list|\+ My List/i);
  if (addList) {
    tap(addList.cx, addList.cy);
    sleep(2);
    hits = parseUi(dumpUi('ui-hero-saved.xml'));
  }
}
shot('hero-saved');
assertStep('hero-saved-list', hits, /In My List/i);

// 3. Test Hero Info -> Title Detail Screen -> Back
const infoBtn = find(hits, /\bDetails\b|\bInfo\b/i);
if (infoBtn) {
  tap(infoBtn.cx, infoBtn.cy);
  const detRes = waitForHit('ui-detail.xml', /Play Feature|Play S1|Cast & Crew|\bBack\b/i, 12);
  hits = detRes.hits;
  shot('detail-screen');
  assertStep('detail-loaded', hits, /Play Feature|Play S1|Cast & Crew|\bBack\b/i);

  const detailBack = find(hits, /\bBack\b/i);
  if (detailBack) {
    tap(detailBack.cx, detailBack.cy);
    sleep(2);
  }
}

// 4. Test Direct Play from Hero -> Watch Screen -> Source Modal -> Back
({ hits } = waitForHit('ui-home-before-play.xml', /\bPlay\b/i, 10));
const play = find(hits, /\bPlay\b/i);
if (play) {
  tap(play.cx, play.cy);
  const watchRes = waitForHit('ui-watch.xml', /Switch source|\bSource\b|Exit player/i, 14);
  hits = watchRes.hits;
  shot('watch-screen');
  const watchOk = assertStep('watch-screen', hits, /Exit player|Switch source/i);

  const sourceBtn = find(hits, /Switch source|\bSource\b/i);
  if (sourceBtn) {
    tap(sourceBtn.cx, sourceBtn.cy);
    const modalRes = waitForHit(
      'ui-watch-sources.xml',
      /Stream Sources|SELECT STREAM SERVER/i,
      8
    );
    hits = modalRes.hits;
    shot('watch-sources-sheet');
    assertStep(
      'watch-sources-modal',
      hits,
      /Stream Sources|SELECT STREAM SERVER/i
    );
    const doneBtn = find(hits, /\bDone\b|Close source menu/i);
    if (doneBtn) {
      tap(doneBtn.cx, doneBtn.cy);
      sleep(2);
    }
  }

  // Wait for modal close animation to finish before tapping Exit player
  ({ hits } = waitForHit('ui-watch-exit.xml', /Exit player/i, 8));
  const back = find(hits, /Exit player/i);
  if (back) {
    tap(back.cx, back.cy);
    sleep(2);
  }
  console.log('watchOk=', watchOk);
}

// 5. Test All 5 Bottom Tabs (My List, Search + Quick Tag, Movies, TV, Home)
for (const [name, re, verifyRe, file] of [
  [
    'tab-mylist',
    /My List/i,
    /Saved movies and series|Your list is empty|All \(/i,
    'tab-mylist',
  ],
  [
    'tab-search',
    /Search/i,
    /Search Netwatch Catalog|All Matches/i,
    'tab-search',
  ],
  [
    'tab-movies',
    /Movies/i,
    /Popular Feature Films|Now In Theaters|TOP FEATURE FILM/i,
    'tab-movies',
  ],
  [
    'tab-tv',
    /\bTV\b/i,
    /Popular TV Series|Currently Airing|SERIES PREMIERE/i,
    'tab-tv',
  ],
  [
    'tab-home',
    /Home/i,
    /Top 10 Trending|Charts in your region|FEATURED PREMIERE/i,
    'tab-home',
  ],
]) {
  hits = parseUi(dumpUi(`pre-${file}.xml`));
  const tab = hits.find(
    (h) => h.cy > 2240 && re.test(`${h.text} ${h.desc}`)
  );
  if (!tab) {
    console.error(`FAIL ${name}: tab not found`);
    continue;
  }
  tap(tab.cx, tab.cy);
  const tabRes = waitForHit(`ui-${file}.xml`, verifyRe, 12);
  hits = tabRes.hits;
  shot(file);
  assertStep(name, hits, verifyRe);

  if (name === 'tab-search') {
    const quickTag = find(hits, /Search Dune|^Dune$/i);
    if (quickTag) {
      tap(quickTag.cx, quickTag.cy);
      const searchRes = waitForHit(
        'ui-search-results.xml',
        /Top Matches|Explore All Results/i,
        12
      );
      hits = searchRes.hits;
      shot('search-results-dune');
      assertStep('search-top-matches', hits, /Top Matches|Dune/i);
    }
  }
}

console.log('E2E Android Emulator suite completed.');
