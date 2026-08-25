import ScrollFrames from './scroll_frames.js';

const catalog = await fetch('./assets/catalog/catalog.json').then((r) => r.json());
const slugs = Object.keys(catalog);

/* ===================== герой: проход по дому ===================== */

const STOPS = [
  { at: [0.000, 0.030], name: 'Столешницы',      meta: 'массив дуба · усиленный щит', slug: 'table-top' },
  { at: [0.170, 0.230], name: 'Подоконники',     meta: 'масло + воск',                slug: 'window-sill' },
  { at: [0.370, 0.430], name: 'Оформление окон', meta: 'наличники и откосы',          slug: 'windows' },
  { at: [0.570, 0.630], name: 'Столы',           meta: 'на заказ по размеру',         slug: 'table' },
  { at: [0.770, 0.830], name: 'Шкафы',           meta: 'фасады из массива',           slug: 'cases' },
  { at: [0.970, 1.000], name: 'И это не всё',    meta: 'девять направлений ниже',     slug: '*' },
];

// Темп: остановка держит ровно столько, чтобы прочитать подпись, а между
// остановками камера идёт быстро. Раньше стоянки съедали больше половины
// прокрутки и проход казался вязким.
const TIMELINE = [
  { to: 0.030, scroll: 1 }, { to: 0.170, scroll: 3 }, { to: 0.230, scroll: 1 },
  { to: 0.370, scroll: 3 }, { to: 0.430, scroll: 1 }, { to: 0.570, scroll: 3 },
  { to: 0.630, scroll: 1 }, { to: 0.770, scroll: 3 }, { to: 0.830, scroll: 1 },
  { to: 0.970, scroll: 3 }, { to: 1.000, scroll: 1 },
];

const stop = document.querySelector('#stop');
const stopName = stop.querySelector('.stop__name');
const stopMeta = stop.querySelector('.stop__meta');
const heroCopy = document.querySelector('#heroCopy');
const proof = document.querySelector('#proof');
const walkbar = document.querySelector('#walkbar');
let shownStop = -1;

// На последней остановке — по одной работе из разных разделов: в открытом
// шкафу должна оказаться вся мастерская, а не один её угол.
function worksFor(slug, n) {
  if (slug !== '*') {
    return (catalog[slug]?.images ?? []).slice(0, n).map((f) => `./assets/catalog/${slug}/${f}`);
  }
  return slugs.slice(0, n).map((k) => `./assets/catalog/${k}/${catalog[k].images[0]}`);
}

const slugOf = (url) => url.split('/').slice(-2)[0];

function showWorks(s) {
  proof.innerHTML = '';
  if (!s) return;
  const urls = worksFor(s.slug, 3);

  urls.forEach((url, k) => {
    const fig = document.createElement('figure');
    fig.className = 'proof__item';
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', `${s.name} — открыть раздел каталога`);
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${s.name} — работа мастерской`;
    fig.append(img);

    const go = () => openCategory(s.slug === '*' ? slugOf(url) : s.slug);
    fig.addEventListener('click', go);
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
    proof.append(fig);
    // Лесенкой, а не пачкой.
    setTimeout(() => fig.classList.add('is-in'), 90 + k * 110);
  });

  const total = s.slug === '*'
    ? Object.values(catalog).reduce((n, c) => n + c.total, 0)
    : catalog[s.slug]?.total ?? 0;
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'proof__all';
  all.textContent = `все ${total} →`;
  all.addEventListener('click', () => openCategory(s.slug === '*' ? slugs[0] : s.slug));
  proof.append(all);
}

function openCategory(slug) {
  renderCategory(slug);
  document.querySelector('#works').scrollIntoView({ block: 'start' });
}

function onFrame(f) {
  const moved = f > 0.04;
  heroCopy.style.opacity = moved ? '0' : '1';
  walkbar.style.width = `${(f * 100).toFixed(1)}%`;

  const i = STOPS.findIndex((s) => f >= s.at[0] && f <= s.at[1]);
  if (i === shownStop) return;
  shownStop = i;

  if (i < 0) { stop.classList.remove('is-on'); showWorks(null); return; }
  // На первой остановке подпись не нужна — там стоит заголовок сайта,
  // но работы показываем уже там: каталог начинается сразу.
  if (i > 0) {
    stopName.textContent = STOPS[i].name;
    stopMeta.textContent = STOPS[i].meta;
    stop.classList.add('is-on');
  } else {
    stop.classList.remove('is-on');
  }
  showWorks(STOPS[i]);
}

new ScrollFrames({
  canvas: document.querySelector('#hero'),
  scroller: document.querySelector('.walk'),
  dir: './frames',
  manifest: './frames/manifest.json',
  timeline: TIMELINE,
  onFrame,
}).start().catch((e) => {
  stopName.textContent = e.message;
  stop.classList.add('is-on');
});

/* ===================== навигация ===================== */

// Бумажная плашка включается только когда проход закончился: порог по высоте
// экрана не годится — секция прохода в восемь экранов.
const nav = document.querySelector('#nav');
const walk = document.querySelector('.walk');
addEventListener('scroll', () => {
  const past = scrollY > walk.offsetTop + walk.offsetHeight - innerHeight * 0.5;
  nav.classList.toggle('is-paper', past);
}, { passive: true });

/* ===================== каталог ===================== */

const catIndex = document.querySelector('#catIndex');
const shelf = document.querySelector('#shelf');
const lb = document.querySelector('#lb');
const lbImg = lb.querySelector('img');
const lbX = document.querySelector('#lbX');

// Цена за квадратный метр есть только у изделий, которые считает калькулятор.
// Остальным честнее написать «по замеру», чем придумать число.
const PRICED = new Set(['table-top', 'window-sill']);
const MIN_RATE = 14300;

function renderCategory(slug) {
  const cat = catalog[slug];
  shelf.innerHTML = '';
  for (const name of cat.images) {
    const fig = document.createElement('figure');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `./assets/catalog/${slug}/${name}`;
    img.alt = `${cat.title} — работа мастерской`;
    fig.append(img);
    fig.addEventListener('click', () => {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lb.hidden = false;
      lbX.focus();
    });
    shelf.append(fig);
  }
  for (const row of catIndex.children) {
    row.setAttribute('aria-selected', String(row.dataset.slug === slug));
  }
}

for (const slug of slugs) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'cat__row';
  row.dataset.slug = slug;
  row.setAttribute('role', 'tab');
  row.setAttribute('aria-selected', 'false');
  row.innerHTML =
    `<span>${catalog[slug].title}</span>` +
    `<span class="cat__price">${PRICED.has(slug)
      ? `от ${MIN_RATE.toLocaleString('ru-RU')} ₽/м²`
      : 'по замеру'}</span>` +
    `<span class="cat__n">${catalog[slug].total}</span>`;
  row.addEventListener('click', () => renderCategory(slug));
  catIndex.append(row);
}
renderCategory(slugs[0]);

function closeLb() { lb.hidden = true; lbImg.src = ''; }
lbX.addEventListener('click', closeLb);
// Клик мимо фотографии закрывает; клик в саму фотографию — нет.
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

/* ===================== калькулятор ===================== */

// Цены за квадратный метр — с действующего сайта мастерской.
// «Сосна ГМЩ» там есть в коде расчёта, но отсутствует в списке выбора: возвращаем.
const MATERIALS = [
  { id: 'dub',    name: 'Дуб — усиленный щит из досок',         rate: 48160 },
  { id: 'kar',    name: 'Карагач — усиленный щит из досок',     rate: 44920 },
  { id: 'yasen',  name: 'Ясень — усиленный щит из досок',       rate: 36740 },
  { id: 'dub2',   name: 'Дуб — готовый мебельный щит',          rate: 36528 },
  { id: 'buk',    name: 'Бук — усиленный щит из досок',         rate: 33800 },
  { id: 'listv',  name: 'Лиственница — усиленный щит из досок', rate: 30840 },
  { id: 'olh',    name: 'Ольха — усиленный щит из досок',       rate: 27080 },
  { id: 'grab',   name: 'Граб — усиленный щит из досок',        rate: 26520 },
  { id: 'sosna',  name: 'Сосна — усиленный щит из досок',       rate: 26120 },
  { id: 'buk2',   name: 'Бук — готовый мебельный щит',          rate: 25440 },
  { id: 'yasen2', name: 'Ясень — готовый мебельный щит',        rate: 23840 },
  { id: 'listv2', name: 'Лиственница — готовый мебельный щит',  rate: 18320 },
  { id: 'sosna2', name: 'Сосна — готовый мебельный щит',        rate: 14300 },
];

const ITEMS = [
  'Подоконник прямой', 'Подоконник Г-образный', 'Подоконник в эркер',
  'Подоконник на лоджию', 'Подоконник-столешница', 'Столешница прямая',
  'Столешница Г-образная', 'Столешница П-образная', 'Столешница для ванной',
  'Столешница для зонирующей перегородки', 'Другое',
];

const FINISHES = [
  'Морилка + лак', 'Лак б/ц матовый', 'Масло + воск', 'Масло тонирующее + лак',
  'Эмаль', 'Эмаль + лак', 'Эмаль + патинирование + лак', 'Другое',
];

const fill = (sel, list, value = (x) => x, text = (x) => x) => {
  for (const x of list) {
    const o = document.createElement('option');
    o.value = value(x);
    o.textContent = text(x);
    sel.append(o);
  }
};

const matSel = document.querySelector('#material');
fill(matSel, MATERIALS, (m) => m.id, (m) => m.name);
fill(document.querySelector('#oMat'), MATERIALS, (m) => m.name, (m) => m.name);
fill(document.querySelector('#oItem'), ITEMS);
fill(document.querySelector('#oFin'), FINISHES);

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const calcOut = document.querySelector('#calcOut');
const calcNote = document.querySelector('#calcNote');
const calcErr = document.querySelector('#calcErr');
const lenEl = document.querySelector('#len');
const widEl = document.querySelector('#wid');

document.querySelector('#calcForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const len = Number(lenEl.value);
  const wid = Number(widEl.value);

  const bad = (msg, el) => {
    calcErr.textContent = msg;
    calcErr.hidden = false;
    calcOut.hidden = calcNote.hidden = true;
    [lenEl, widEl].forEach((n) => n.setAttribute('aria-invalid', String(n === el)));
    el?.focus();
  };

  if (!len || !wid) return bad('Укажите длину и ширину в сантиметрах.', !len ? lenEl : widEl);
  if (len < 6) return bad('Длина меньше 6 см — проверьте, что значение в сантиметрах.', lenEl);
  if (wid < 6) return bad('Ширина меньше 6 см — проверьте, что значение в сантиметрах.', widEl);
  if (len > 600) return bad(`Длина ${len} см великовата. Если это миллиметры, получится ${Math.round(len / 10)} см.`, lenEl);
  if (wid > 150) return bad(`Ширина ${wid} см великовата. Если это миллиметры, получится ${Math.round(wid / 10)} см.`, widEl);

  const mat = MATERIALS.find((m) => m.id === matSel.value);
  const area = (len * wid) / 10000;
  [lenEl, widEl].forEach((n) => n.setAttribute('aria-invalid', 'false'));
  calcErr.hidden = true;
  document.querySelector('#outArea').textContent = `${area.toFixed(3)} м²`;
  document.querySelector('#outRate').textContent = `${money.format(mat.rate)}/м²`;
  document.querySelector('#outSum').textContent = money.format(area * mat.rate);
  calcOut.hidden = calcNote.hidden = false;
});

/* ===================== заявка ===================== */

// Бэкенда нет, поэтому форма собирает готовое сообщение и отдаёт его
// в тот канал, которым мастерская уже пользуется.
const PHONE = '79257086253';
const MAIL = 'info@woodenwolf.ru';
const orderErr = document.querySelector('#orderErr');

function buildMessage() {
  const v = (id) => document.querySelector(id).value.trim();
  const name = v('#oName');
  const phone = v('#oPhone');
  const nameEl = document.querySelector('#oName');
  const phoneEl = document.querySelector('#oPhone');

  if (!name || !phone) {
    orderErr.textContent = 'Заполните имя и телефон — без них мы не сможем ответить.';
    orderErr.hidden = false;
    nameEl.setAttribute('aria-invalid', String(!name));
    phoneEl.setAttribute('aria-invalid', String(!phone));
    (!name ? nameEl : phoneEl).focus();
    return null;
  }
  orderErr.hidden = true;
  [nameEl, phoneEl].forEach((n) => n.setAttribute('aria-invalid', 'false'));

  const rows = [
    ['Изделие', v('#oItem')], ['Материал', v('#oMat')], ['Покрытие', v('#oFin')],
    ['Размеры', v('#oSize')], ['Имя', name], ['Телефон', phone],
    ['Адрес', v('#oAddr')], ['Подробности', v('#oNote')],
  ].filter(([, val]) => val);

  return 'Заявка на расчёт\n' + rows.map(([k, val]) => `${k}: ${val}`).join('\n');
}

document.querySelectorAll('[data-send]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const msg = buildMessage();
    if (!msg) return;
    const enc = encodeURIComponent(msg);
    const to = {
      wa: `https://wa.me/${PHONE}?text=${enc}`,
      tg: `https://t.me/+${PHONE}?text=${enc}`,
      mail: `mailto:${MAIL}?subject=${encodeURIComponent('Заявка на расчёт')}&body=${enc}`,
    }[btn.dataset.send];

    // Тихий успех вместо победного тоста: кнопка сама сообщает, что сработала.
    btn.dataset.state = 'success';
    const label = btn.textContent;
    btn.textContent = 'Открываем…';
    setTimeout(() => { delete btn.dataset.state; btn.textContent = label; }, 1600);
    open(to, '_blank', 'noopener');
  });
});
