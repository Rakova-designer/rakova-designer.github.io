/* Портфолио — Надежда Ракова
   1) масштаб макета: 1rem = 100px при ширине 1920px
   2) бесконечная карусель
   3) видео-креативы: играют только в зоне видимости
   4) появление блоков при прокрутке
   5) плеер по нажатию (Rutube)
   6) мобильное меню

   Активный пункт меню не вычисляется: каждый кейс — отдельная страница,
   класс is-active проставлен в разметке.                                   */

(function () {
  'use strict';

  var DESIGN_WIDTH = 1920;
  var MOBILE_BREAKPOINT = 1200;
  var root = document.documentElement;
  var hasObserver = 'IntersectionObserver' in window;

  /* ---------------------------------------------------------------- масштаб */

  function applyScale() {
    // clientWidth, а не 100vw — чтобы вертикальный скроллбар не давал переполнение
    var width = root.clientWidth;
    if (width > MOBILE_BREAKPOINT) {
      root.style.fontSize = (width / DESIGN_WIDTH) * 100 + 'px';
    } else {
      root.style.fontSize = '';
    }
  }

  applyScale();
  window.addEventListener('resize', applyScale);
  window.addEventListener('orientationchange', applyScale);

  /* -------------------------------------------- бесконечная карусель */

  // Листание пальцем, тачпадом и клавиатурой даёт сам браузер (scroll-snap).
  // Скрипт делает ленту бесконечной, добавляет стрелки и перетаскивание мышью.
  //
  // Бесконечность: перед карточками и после них ставится по полной копии набора.
  // Когда лента останавливается на копии, прокрутка незаметно переносится на
  // такую же карточку в оригинальном наборе — содержимое одинаковое, скачка
  // не видно. Секция стоит до видео-креативов намеренно: ролики в копиях
  // должны попасть в общий список видео и так же играть в зоне видимости.
  Array.prototype.forEach.call(document.querySelectorAll('.carousel'), function (carousel) {
    var viewport = carousel.querySelector('.carousel__viewport');
    var track = carousel.querySelector('.carousel__track');
    if (!viewport || !track || !track.children.length) { return; }

    var originals = Array.prototype.slice.call(track.children);
    var count = originals.length;

    function copySet() {
      var set = document.createDocumentFragment();
      originals.forEach(function (card) {
        var copy = card.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true'); // скринридеру хватит оригиналов
        copy.setAttribute('data-clone', '');
        set.appendChild(copy);
      });
      return set;
    }

    track.insertBefore(copySet(), track.firstChild);
    track.appendChild(copySet());

    // [копии][оригиналы][копии] — оригиналы занимают индексы count .. 2*count-1
    var cards = Array.prototype.slice.call(track.children);
    var prev = carousel.querySelector('.carousel__arrow--prev');
    var next = carousel.querySelector('.carousel__arrow--next');
    var drag = null;

    // прокрутка, при которой карточка стоит ровно по центру окна
    function centerOf(card) {
      return card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2;
    }

    function currentIndex() {
      var index = 0;
      var best = Infinity;
      cards.forEach(function (card, i) {
        var distance = Math.abs(centerOf(card) - viewport.scrollLeft);
        if (distance < best) { best = distance; index = i; }
      });
      return index;
    }

    function behavior() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    }

    // Остановились на копии — переносимся на ту же карточку в оригиналах.
    // Время роликов переносим тоже, иначе анимация на экране дёрнулась бы.
    function wrap() {
      if (drag) { return; }
      var index = currentIndex();
      if (index >= count && index < 2 * count) { return; }

      var target = index < count ? index + count : index - count;
      var from = cards[index].querySelectorAll('video');
      var to = cards[target].querySelectorAll('video');
      Array.prototype.forEach.call(to, function (video, i) {
        if (from[i] && from[i].readyState > 0 && video.readyState > 0) {
          video.currentTime = from[i].currentTime;
        }
      });

      viewport.scrollLeft += centerOf(cards[target]) - centerOf(cards[index]);
    }

    // В макете по центру средний экран, соседние свисают за края.
    viewport.scrollLeft = centerOf(cards[count + Math.floor((count - 1) / 2)]);

    function go(step) {
      var index = Math.max(0, Math.min(cards.length - 1, currentIndex() + step));
      viewport.scrollTo({ left: centerOf(cards[index]), behavior: behavior() });
    }

    if (prev) { prev.addEventListener('click', function () { go(-1); }); }
    if (next) { next.addEventListener('click', function () { go(1); }); }

    // После каждой остановки ленты проверяем, не стоим ли на копии. Где нет
    // события scrollend, ждём паузу в прокрутке.
    if ('onscrollend' in window) {
      viewport.addEventListener('scrollend', wrap);
    } else {
      var settle;
      viewport.addEventListener('scroll', function () {
        clearTimeout(settle);
        settle = setTimeout(wrap, 150);
      });
    }

    // Перетаскивание мышью. Палец и перо листают нативно — их не трогаем.
    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) { return; }
      drag = { x: event.clientX, left: viewport.scrollLeft };
      viewport.classList.add('is-dragging'); // привязка к карточкам выключается на время
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener('pointermove', function (event) {
      if (drag) { viewport.scrollLeft = drag.left - (event.clientX - drag.x); }
    });

    function release() {
      if (!drag) { return; }
      drag = null;

      // доводим до ближайшей карточки и только потом возвращаем привязку
      var target = centerOf(cards[currentIndex()]);
      function snapBack() { viewport.classList.remove('is-dragging'); }

      if (Math.abs(target - viewport.scrollLeft) < 1) { snapBack(); wrap(); return; }
      viewport.scrollTo({ left: target, behavior: behavior() });
      if ('onscrollend' in window) {
        viewport.addEventListener('scrollend', snapBack, { once: true });
      } else {
        setTimeout(snapBack, 500);
      }
    }

    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
  });

  /* ------------------------------------------ видео-креативы (Mooni) */

  var videos = Array.prototype.slice.call(document.querySelectorAll('.media--video video, .stage__media video'));

  if (videos.length) {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var inView = [];

    function isInView(video) { return inView.indexOf(video) !== -1; }

    function markInView(video, state) {
      var at = inView.indexOf(video);
      if (state && at === -1) { inView.push(video); }
      if (!state && at !== -1) { inView.splice(at, 1); }
    }

    function play(video) {
      if (reducedMotion.matches || !isInView(video)) { return; }
      // autoplay может быть отклонён политикой браузера — тогда остаётся poster
      var attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') { attempt.catch(function () {}); }
    }

    function stopAll() {
      videos.forEach(function (video) {
        video.pause();
        video.removeAttribute('autoplay');
      });
    }

    if (hasObserver) {
      // играем только то, что видно, иначе шесть роликов зря греют процессор
      var playbackObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          markInView(entry.target, entry.isIntersecting);
          if (entry.isIntersecting) { play(entry.target); } else { entry.target.pause(); }
        });
      }, { rootMargin: '100px 0px' });

      videos.forEach(function (video) { playbackObserver.observe(video); });
    } else {
      videos.forEach(function (video) { markInView(video, true); });
    }

    // ролик мог доехать позже первого play() — повторяем попытку, когда готов
    videos.forEach(function (video) {
      video.addEventListener('loadeddata', function () { play(video); });
    });

    if (reducedMotion.matches) { stopAll(); }

    reducedMotion.addEventListener('change', function (event) {
      if (event.matches) { stopAll(); } else { videos.forEach(play); }
    });

    /* ---------------------------------- уход со страницы с роликами */

    // Пока следующая страница не нарисована, браузер показывает последний
    // кадр текущей — но без роликов: видео рисуется отдельным слоем, и его
    // браузер выгружает сразу, на месте ролика мелькает пустота. Картинка
    // под роликом не спасает: место под непрозрачным видео не рисуется вовсе.
    // Поэтому перед уходом текущий кадр каждого видимого ролика переносится
    // на canvas, ролик прячется, и последний кадр страницы — уже без видео.
    var FROZEN_STYLES = ['display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'objectFit', 'objectPosition', 'borderRadius'];

    function freezeVideos() {
      var frozen = 0;
      videos.forEach(function (video) {
        if (video.readyState < 2 || video.style.display === 'none') { return; }
        var rect = video.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight || !rect.width) { return; }

        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        try { canvas.getContext('2d').drawImage(video, 0, 0); } catch (e) { return; }

        // canvas занимает ровно место ролика и кадрируется так же
        var style = window.getComputedStyle(video);
        FROZEN_STYLES.forEach(function (name) { canvas.style[name] = style[name]; });
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('data-frozen', '');

        video.parentNode.insertBefore(canvas, video);
        video.style.display = 'none';
        frozen++;
      });
      return frozen;
    }

    // вернулись кнопкой «назад» из кэша браузера — ролики снова на месте
    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) { return; }
      Array.prototype.forEach.call(document.querySelectorAll('canvas[data-frozen]'), function (canvas) {
        canvas.parentNode.removeChild(canvas);
      });
      videos.forEach(function (video) { video.style.display = ''; });
    });

    // Переход по ссылке: подменяем ролики и уходим через кадр, когда подмена
    // уже на экране. Ссылки в новой вкладке, якоря и клики с модификаторами
    // не трогаем.
    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }

      var link = event.target.closest && event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') ||
          (link.target && link.target !== '_self')) { return; }

      var url = new URL(link.href, location.href);
      if (!/^https?:$/.test(url.protocol)) { return; }
      if (url.pathname === location.pathname && url.search === location.search) { return; }

      if (!freezeVideos()) { return; }

      event.preventDefault();
      var gone = false;
      function leave() {
        if (gone) { return; }
        gone = true;
        location.href = url.href;
      }
      requestAnimationFrame(function () { requestAnimationFrame(leave); });
      // в фоновой вкладке кадры не рисуются — переход не должен зависнуть
      setTimeout(leave, 120);
    });

    // Уход кнопками браузера: успеваем ли подменить кадр — решает браузер,
    // но там, где событие есть, оно приходит до последней отрисовки.
    window.addEventListener('pageswap', freezeVideos);
  }

  /* -------------------------------- появление блоков при прокрутке */

  // Классы навешиваем из скрипта: без JS страница должна остаться читаемой,
  // а не белым экраном из элементов с opacity: 0.
  var lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (hasObserver && !lessMotion.matches) {
    var STEP = 90;  // шаг между блоками, мс
    var NUDGE = 40; // шаг между элементами внутри блока, мс
    var groups = [];

    // Внутри сцены анимируем сами элементы, а не блоки-обёртки: подпись,
    // абзац, список, каждый кружок палитры и каждую иконку скилов. Ряды
    // кружков разбираются поштучно — они читаются как отдельные объекты.
    function leaves(node) {
      // Разбираем только контейнеры: у абзаца дочерний элемент — это <br>,
      // и подменять им текст нельзя, абзац показывается целиком.
      if (node.tagName !== 'DIV' || !node.children.length) { return [{ node: node }]; }

      var out = [];

      Array.prototype.forEach.call(node.children, function (child) {
        if (child.classList.contains('palette') || child.classList.contains('skills')) {
          Array.prototype.forEach.call(child.children, function (item) {
            out.push({ node: item, soft: true }); // кружку 48px хватает половины дистанции
          });
        } else {
          out.push({ node: child });
        }
      });

      return out;
    }

    // Сцена собирается вручную: она видна сразу при загрузке, поэтому её
    // содержимое выезжает по очереди — заголовок, бейдж, дальше колонки.
    // Визуал и первый текстовый блок идут одной ступенью, чтобы низ сцены
    // не заполнялся заметно позже верха.
    function collectStage(stage) {
      // Сама панель только проявляется. Сдвиг ей не годится: она занимает
      // почти весь экран и на всех страницах выглядит одинаково, поэтому её
      // выезд читается как скачок всей страницы относительно сайдбара,
      // который при переходе остаётся на месте.
      var seq = [{ node: stage, delay: 0, fade: true }];
      var title = stage.querySelector('.stage__title');
      var badge = stage.querySelector('.badge');
      var visual = stage.querySelector('.col-visual, .speaker-visual');

      if (title) { seq.push({ node: title, delay: STEP }); }
      if (badge) { seq.push({ node: badge, delay: STEP * 2 }); }
      // визуал только проявляется: сдвиг вниз вылез бы за нижнюю грань сцены
      if (visual) { seq.push({ node: visual, delay: STEP * 3, fade: true }); }

      // Задержка накопительная, а не по номеру блока: у длинного блока
      // собственная очередь длиннее шага, и следующий заголовок иначе
      // выезжал бы раньше последнего абзаца предыдущего.
      var clock = STEP * 3;

      Array.prototype.forEach.call(stage.querySelectorAll('.col-text > *'), function (node) {
        var items = leaves(node);
        items.forEach(function (leaf, j) {
          seq.push({ node: leaf.node, delay: clock + j * NUDGE, soft: leaf.soft });
        });
        clock += Math.max(STEP, items.length * NUDGE);
      });

      return seq;
    }

    Array.prototype.forEach.call(document.querySelectorAll('.section > *'), function (block) {
      if (block.classList.contains('stage')) { groups.push(collectStage(block)); return; }

      // сетка карточек выезжает по одной, прочие блоки — цельной конструкцией
      var grid = block.querySelector('.grid');
      var nodes = grid ? grid.children : [block];

      groups.push(Array.prototype.map.call(nodes, function (node, i) {
        return { node: node, delay: i * STEP };
      }));
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target); // показываем один раз
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    groups.forEach(function (group) {
      group.forEach(function (item) {
        item.node.classList.add('reveal');
        if (item.fade) { item.node.classList.add('reveal--fade'); }
        if (item.soft) { item.node.classList.add('reveal--soft'); }
        if (item.delay) { item.node.style.animationDelay = item.delay + 'ms'; }
        revealObserver.observe(item.node);
      });
    });
  }

  // Предварительное скрытие снимаем в любом случае и в том же синхронном
  // проходе, что и расстановку классов, — промежуточный кадр не рисуется.
  root.classList.add('reveal-armed');

  /* ------------------------------------------ плеер по нажатию (Rutube) */

  // Обложка-кнопка меняется на iframe только по клику: плеер тяжёлый и до
  // нажатия не нужен. Клик — жест пользователя, после него браузер разрешает
  // запуск со звуком; плееру это разрешение передаётся через allow="autoplay".
  Array.prototype.forEach.call(document.querySelectorAll('.media--embed'), function (card) {
    var cover = card.querySelector('.embed__cover');
    if (!cover) { return; }

    cover.addEventListener('click', function () {
      var url = card.getAttribute('data-embed');
      // autostartmute=false — просим стартовать именно со звуком
      var src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'autoplay=true&autostartmute=false';

      var frame = document.createElement('iframe');
      frame.src = src;
      frame.title = card.getAttribute('data-embed-title') || 'Видео';
      // полноэкранный режим разрешён здесь же, отдельный allowfullscreen не нужен
      frame.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write';

      // Rutube не гарантирует автозапуск по параметру адреса, поэтому, когда
      // плеер сообщит о готовности, дублируем «играть» и «со звуком» через его
      // postMessage-API. Слушаем только свой iframe.
      function onMessage(event) {
        if (event.source !== frame.contentWindow) { return; }
        var message = event.data;
        if (typeof message === 'string') {
          try { message = JSON.parse(message); } catch (e) { return; }
        }
        if (!message || message.type !== 'player:ready') { return; }

        ['player:play', 'player:unMute'].forEach(function (type) {
          frame.contentWindow.postMessage(JSON.stringify({ type: type, data: {} }), '*');
        });
        window.removeEventListener('message', onMessage);
      }
      window.addEventListener('message', onMessage);

      card.replaceChild(frame, cover);
      frame.focus();
    });
  });

  /* ---------------------------------------------------- мобильное меню */

  var toggle = document.querySelector('.sidebar__toggle');
  var nav = document.getElementById('nav');

  function isMobile() { return root.clientWidth <= MOBILE_BREAKPOINT; }

  function syncNavVisibility() {
    if (isMobile()) {
      if (toggle.getAttribute('aria-expanded') !== 'true') { nav.hidden = true; }
    } else {
      nav.hidden = false;
    }
  }

  if (toggle && nav) {
    syncNavVisibility();
    window.addEventListener('resize', syncNavVisibility);

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.hidden = open;
    });
  }
})();
