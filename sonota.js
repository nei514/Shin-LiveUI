const ticker = document.getElementById("ticker");
const wrapper = document.querySelector(".ticker-wrapper");
const tickerArea = document.querySelector('.ticker-area');
const clock = document.getElementById("clock");
const WEATHER_SOURCE_HTML = `
  <span class="weather-source">出典：Weathernews</span>
`;

// 設定: JS側で枚数だけ指定したい場合はここを編集してください
// WARNINGSIZE を 0 にすると画面解像度に合わせた自動算出を有効にします
const WARNINGSIZE = 0; // 0 = 自動（解像度ベース）。正の整数を入れると固定枚数になります。
const WARNING_WIDGET_ENABLED = true; // false にするとウィジェットを完全に無効化します

// 時計領域とテロップの余白調整
const CLOCK_LEFT_GAP = 12;
function updateTickerAreaRight() {
  if (!tickerArea || !clock) return;
  const cs = window.getComputedStyle(clock);
  const clockRight = parseInt(cs.right) || 8;
  const clockWidth = clock.offsetWidth || 0;
  const rightPx = clockWidth + clockRight + CLOCK_LEFT_GAP;
  tickerArea.style.right = rightPx + 'px';
}
window.addEventListener('resize', updateTickerAreaRight);
window.addEventListener('load', updateTickerAreaRight);

// 天気図要素
const weatherMapImg = document.getElementById('weatherMap');
const loadingText = document.getElementById('loading');

let weatherHTMLs = [];
let combinedItems = []; // ← 天気のみ
let currentIndex = 0;
let animationId = null;
let warningShowIntervalId = null;
let pendingCombinedItems = null;
// 時計
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  if (clock) clock.textContent = `${hh}:${mm}:${ss}`;
}
setInterval(updateClock, 1000);
updateClock();

// 天気図読み込み
async function loadWeatherMap() {
  if (!weatherMapImg || !loadingText) return;
  try {
    const res = await fetch('https://www.jma.go.jp/bosai/weather_map/data/list.json');
    const data = await res.json();
    if (data.near && data.near.now && data.near.now.length > 0) {
      const firstCode = data.near.now[21];
      const imageUrl = `https://www.jma.go.jp/bosai/weather_map/data/png/${firstCode}`;
      weatherMapImg.onload = function() {
        weatherMapImg.style.display = 'block';
        loadingText.style.display = 'none';
        updateWarningWidgetHeight();
        console.log('天気図を読み込みました:', imageUrl);
      };
      weatherMapImg.onerror = function(e) {
        console.error('天気図画像読み込みエラー', e);
        loadingText.textContent = '天気図の読み込みに失敗しました';
        updateWarningWidgetHeight();
      };
      weatherMapImg.src = imageUrl;
    } else {
      loadingText.textContent = '天気図データが見つかりませんでした';
    }
  } catch (e) {
    console.error('天気図取得失敗:', e);
    loadingText.textContent = '天気図の読み込みに失敗しました';
  }
}

// ウィジェット高さを天気図上端ギリギリまで合わせる
function updateWarningWidgetHeight() {
  if (!WARNING_WIDGET_ENABLED) return;
  const widget = document.getElementById('warning-widget');
  const map = document.getElementById('weatherMap');
  if (!widget) return;
  const topOffset = 12;
  const gap = 8;
  if (map && map.style.display !== 'none') {
    const rect = map.getBoundingClientRect();
    let maxH = Math.floor(rect.top - gap - topOffset);
    if (maxH < 80) maxH = 80;
    widget.style.maxHeight = maxH + 'px';
    widget.style.overflow = 'auto';
  } else {
    const maxH = Math.max(120, Math.floor(window.innerHeight - topOffset - 24));
    widget.style.maxHeight = Math.min(maxH, Math.floor(window.innerHeight * 0.8)) + 'px';
    widget.style.overflow = 'auto';
  }
}
window.addEventListener('resize', updateWarningWidgetHeight);
window.addEventListener('load', updateWarningWidgetHeight);

// 天気情報取得
async function fetchWeather() {
  try {
    const res = await fetch("https://weathernews.jp/forecast/xml/all.xml");
    const xmlText = await res.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const points = Array.from(xmlDoc.getElementsByTagName("point"));

    const uniquePoints = {};
    points.forEach(point => {
      const id = point.getAttribute("id");
      if (!uniquePoints[id]) {
        const name = point.getAttribute("name");
        const weatherRaw = point.getElementsByTagName("weather")[0]?.textContent || "";
        const firstWeatherValue = weatherRaw.split(",")[0];
        const iconUrl = `https://weathernews.jp/s/topics/img/wxicon/${firstWeatherValue}.png`;
        const maxtempRaw = point.getElementsByTagName("maxtemp")[0]?.textContent || "";
        const mintempRaw = point.getElementsByTagName("mintemp")[0]?.textContent || "";
        const maxtemp = maxtempRaw.match(/\d+/)?.[0] || "-";
        const mintemp = mintempRaw.match(/\d+/)?.[0] || "-";
        const html = `\n        <img src="${iconUrl}" alt="weather icon">\n        <span class="region-name">${name}</span>\n        <span class="temp max-temp">${maxtemp}℃</span><span class="slash">  /</span><span class="temp min-temp">${mintemp}℃</span>\n      `;
        uniquePoints[id] = html;
      }
    });
    weatherHTMLs = Object.values(uniquePoints);
  } catch (e) {
    console.error("天気取得失敗:", e);
    weatherHTMLs = [`<span>天気情報を取得できませんでした。</span>`];
  }
}


// 天気HTML連結
function getCombinedWeatherHTML() {
  return weatherHTMLs.join('　');
}
// ビルド専用: 合成アイテム配列を返す（ただちに適用しない）
// 返り値の順序: 天気（必ず先頭）→ ニュース見出し（存在すれば続く）
function buildCombinedItems() {
  return [
    weatherHTMLs.join('　'),
    WEATHER_SOURCE_HTML
  ];
}


// テロップ
const speedWeather = 100;
const speedNews = 100;
function startTicker() {
const ticker = document.getElementById("ticker");
const area = document.querySelector('.ticker-area');
if (!ticker) return;


ticker.innerHTML = combinedItems[currentIndex];
let pos = area.offsetWidth;
ticker.style.left = pos + "px";


function anim() {
pos -= 3;
ticker.style.left = pos + "px";
if (pos + ticker.offsetWidth < 0) {
  currentIndex++;
  if (currentIndex >= combinedItems.length) {
    currentIndex = 0;
  }
  ticker.innerHTML = combinedItems[currentIndex];
  pos = area.offsetWidth;
}

animationId = requestAnimationFrame(anim);
}
anim();
}
// 地震メッセージを即時に先頭で流す（強制表示）
function showQuakeNow() {
  // 即時割り込みは行わず、次の一巡が終わった時点で適用する（現在の表示を邪魔しない）
  const newItems = buildCombinedItems();
  if (animationId) {
    pendingCombinedItems = newItems;
  } else {
    combinedItems = newItems;
    currentIndex = 0;
    startTicker();
  }
}

// 全更新
async function updateAll() {
  await loadWeatherMap();
  await fetchWeather();
  if (WARNING_WIDGET_ENABLED && typeof loadAllRegions === 'function') {
    try { await loadAllRegions(); } catch(e){ console.error('loadAllRegions エラー', e); }
    try { updateWarningWidgetHeight(); } catch(e) { /* ignore */ }
  }
  const newItems = buildCombinedItems();
  if (animationId) {
    // 表示中なら一巡が終わるまで適用を保留する
    pendingCombinedItems = newItems;
  } else {
    // 未表示なら即時適用
    combinedItems = newItems;
    currentIndex = 0;
    startTicker();
  }
  // 上部ニュースも更新
  }
async function updateE(){
  GetQuake();
}
updateAll();
setInterval(updateE, 3000);
setInterval(updateAll, 5 * 60 * 1000);// -------------------------
// 警報ウィジェット: DOM を JS 側で生成（HTML側に直接要素は不要）
// -------------------------
function ensureWarningWidgetExists() {
  if (document.getElementById('warning-widget')) return;
  const widget = document.createElement('div');
  widget.id = 'warning-widget';
  widget.className = 'warning-embedded';
  widget.setAttribute('aria-label', '警報・注意報ウィジェット');
  const title = document.createElement('div');
  title.className = 'warning-title';
  title.textContent = '発表されている気象警報/注意報';
  const container = document.createElement('div');
  container.id = 'warning-card-container';
  container.textContent = '読み込み中...';
  widget.appendChild(title);
  widget.appendChild(container);
  const tickerWrapper = document.querySelector('.ticker-wrapper');
  if (tickerWrapper && tickerWrapper.parentNode) tickerWrapper.parentNode.insertBefore(widget, tickerWrapper);
  else document.body.appendChild(widget);
}

// データ取得と表示
async function loadAllRegions() {
  if (!WARNING_WIDGET_ENABLED) return;
  console.log('[warning] loadAllRegions: start');
  ensureWarningWidgetExists();
  const container = document.getElementById("warning-card-container");
  if (!container) return;
  container.innerHTML = "";
  try {
    const res = await fetch('https://www.data.jma.go.jp/developer/xml/feed/extra.xml');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const entries = xml.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");
    console.log('[warning] loadAllRegions: extra.xml entries=', entries.length);
    let allCards = [];
    for (let i = 0; i < entries.length; i++) {
      const linkEl = entries[i].getElementsByTagNameNS("http://www.w3.org/2005/Atom", "link")[0];
      if (!linkEl) continue;
      const href = linkEl.getAttribute("href");
      if (!href) continue;
      try {
        const regionRes = await fetch(href);
        const regionText = await regionRes.text();
        const regionXml = parser.parseFromString(regionText, "application/xml");
        const nsBody = "http://xml.kishou.go.jp/jmaxml1/body/meteorology1/";
        const warnings = regionXml.getElementsByTagNameNS(nsBody, "Warning");
        for (let w = 0; w < warnings.length; w++) {
          const items = warnings[w].getElementsByTagNameNS(nsBody, "Item");
          for (let j = 0; j < items.length; j++) {
            const areaEl = items[j].getElementsByTagNameNS(nsBody, "Area")[0] || items[j].getElementsByTagName("Area")[0];
            const kindEl = items[j].getElementsByTagNameNS(nsBody, "Kind")[0] || items[j].getElementsByTagName("Kind")[0];
            if (!areaEl || !kindEl) continue;
            const regionName = areaEl.getElementsByTagName("Name")[0]?.textContent || "不明地域";
            const warningName = kindEl.getElementsByTagName("Name")[0]?.textContent || "";
            const status = kindEl.getElementsByTagName("Status")[0]?.textContent || "";
            // 解除（解除情報）は表示しない
            if (status && status.includes('解除')) continue;
            if (!warningName || status === "発表警報・注意報はなし") continue;
            const card = document.createElement("div");
            card.className = "card";
            const regionDiv = document.createElement("div");
            regionDiv.className = "region";
            regionDiv.textContent = regionName;
            const warningDiv = document.createElement("div");
            warningDiv.className = "warning";
            if(status.includes("解除")) warningDiv.classList.add("解除");
            else if(warningName.includes("警報")) warningDiv.classList.add("警報");
            else warningDiv.classList.add("注意報");
            warningDiv.textContent = `${warningName} ${status}`.trim();
            card.appendChild(regionDiv);
            card.appendChild(warningDiv);
            allCards.push(card);
          }
        }
      } catch(e) {
        console.error(`地域XML取得失敗: ${href}`, e);
      }
    }
    if(allCards.length === 0){
      container.innerHTML = "<div>全国で発表中の警報・注意報はありません</div>";
      console.log('[warning] loadAllRegions: no active warnings');
      return;
    }
    let index = 0;
    function computeCardsForResolution(containerEl) {
      // 高さベースで表示できる枚数を計算
      const gap = 10; // CSS の gap に合わせる
      const minCardHeight = 58; // styles.css の .card min-height に一致
      const availableHeight = containerEl?.clientHeight || Math.floor(window.innerHeight * 0.4);
      const byHeight = Math.max(1, Math.floor(availableHeight / (minCardHeight + gap)));

      // 横幅（解像度）による上限を決める（小さい画面ほど上限を下げる）
      const vw = window.innerWidth;
      let widthLimit = 7; // デフォルト最大
      if (vw < 480) widthLimit = 2;
      else if (vw < 768) widthLimit = 3;
      else if (vw < 1024) widthLimit = 5;
      else widthLimit = 7;

      // 最終的な候補は高さで計算した枚数と幅上限の最小値
      return Math.max(1, Math.min(byHeight, widthLimit));
    }

      // カードの見た目（高さ・パディング・タイトルサイズ）を解像度に合わせて調整
      function adjustCardSizeForResolution() {
        const vw = window.innerWidth;
        // defaults
        let cardPadding = 14;
        let cardMinHeight = 58;
        let titleSize = 18;
        if (vw < 480) {
          cardPadding = 8;
          cardMinHeight = 44;
          titleSize = 13;
        } else if (vw < 768) {
          cardPadding = 10;
          cardMinHeight = 52;
          titleSize = 14;
        } else if (vw < 1024) {
          cardPadding = 12;
          cardMinHeight = 60;
          titleSize = 16;
        } else {
          cardPadding = 14;
          cardMinHeight = 72;
          titleSize = 18;
        }
        // CSS 変数にセット
        document.documentElement.style.setProperty('--card-padding', cardPadding + 'px');
        document.documentElement.style.setProperty('--card-min-height', cardMinHeight + 'px');
        document.documentElement.style.setProperty('--warning-title-size', titleSize + 'px');
      }

      // 初回とリサイズ時に適用
      window.addEventListener('resize', () => {
        adjustCardSizeForResolution();
        // cards が再計算されるタイミングで表示枚数も変わるのでページをリフレッシュ
        index = 0;
        showNextPage();
      });
      adjustCardSizeForResolution();

    function cardsPerPageCalc() {
      const widget = document.getElementById('warning-widget');
      const dataCount = widget?.getAttribute('data-cards');
      const parsed = dataCount ? parseInt(dataCount, 10) : NaN;
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
      // WARNINGSIZE が正の整数ならそれを優先（従来互換）
      if (Number.isInteger(WARNINGSIZE) && WARNINGSIZE > 0) return WARNINGSIZE;
      // そうでなければ解像度ベースで算出
      return computeCardsForResolution(container);
    }
    function showNextPage() {
      container.innerHTML = "";
      const cardsPerPage = cardsPerPageCalc();
      const pageCards = allCards.slice(index, index + cardsPerPage);
      pageCards.forEach(c => container.appendChild(c));
      index += cardsPerPage;
      if(index >= allCards.length) index = 0;
    }
    showNextPage();
    console.log('[warning] loadAllRegions: rendered', Math.min(allCards.length, cardsPerPageCalc()), 'cards');
    if (warningShowIntervalId) { clearInterval(warningShowIntervalId); warningShowIntervalId = null; }
    warningShowIntervalId = setInterval(showNextPage, 3000);
    window.addEventListener("resize", () => {
      index = 0;
      showNextPage();
    });
  } catch(e) {
    console.error(e);
    container.innerHTML = "<div>データを取得できませんでした。</div>";
  }
}

// -------------------------
// 上部 NHK ニュース見出し表示
// -------------------------
function ensureTopNewsExists() {
  if (document.getElementById('news-top')) return;
  const el = document.createElement('div');
  el.id = 'news-top';
  el.className = 'news-top';
  el.textContent = 'ニュースを読み込み中...';
  el.style.display = 'none';
  document.body.appendChild(el);
}

async function fetchTopNews() {}

function updateTopNewsDisplay(text) {
  ensureTopNewsExists();
  const el = document.getElementById('news-top');
  if (!el) return;
  el.textContent = text || '';
}

function showNextTopNewsOnce() {
  stopTopNewsRotation();
  if (!topNewsQueue || topNewsQueue.length === 0) return;
  const next = topNewsQueue.shift();
  updateTopNewsDisplay(next);
  // 次があれば4秒後に再び表示
  if (topNewsQueue.length > 0) {
    topNewsIntervalId = setTimeout(() => {
      showNextTopNewsOnce();
    }, TOP_NEWS_ITEM_MS);
  } else {
    topNewsIntervalId = null;
    // 最後の見出しを表示した後、一定時間で非表示にする
    setTimeout(() => {
      const el = document.getElementById('news-top');
      if (el) el.style.display = 'none';
    }, TOP_NEWS_ITEM_MS);
  }
}

function stopTopNewsRotation() {
  if (topNewsIntervalId) { clearTimeout(topNewsIntervalId); topNewsIntervalId = null; }
}
