/* Asçelik — etkileşimler (bağımlılıksız, ilerlemeli geliştirme) */
(() => {
  'use strict';

  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saver = Boolean(navigator.connection && navigator.connection.saveData);
  const hasIO = 'IntersectionObserver' in window;

  root.classList.add('js'); // <head> içindeki satır içi betik de ekler; burada yedek

  /* ---------- Anlamsal yamalar ---------- */
  // list-style:none, Safari/VoiceOver'da liste anlamını düşürür
  $$('ul, ol').forEach((l) => { if (!l.hasAttribute('role')) l.setAttribute('role', 'list'); });
  // Yeni sekmede açılan bağlantıları ekran okuyuculara bildir
  $$('a[target="_blank"]').forEach((a) => {
    if (a.hasAttribute('aria-label') || $('.sr', a)) return;
    const note = d.createElement('span');
    note.className = 'sr';
    note.textContent = ' (yeni sekmede açılır)';
    a.appendChild(note);
  });

  /* ---------- Header durumu + okuma ilerlemesi ---------- */
  const hdr = $('.hdr');
  const bar = $('.progress span');
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    if (hdr) hdr.classList.toggle('is-stuck', y > 24);
    const max = root.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Mobil menü ---------- */
  const burger = $('.burger');
  const mnav = $('#mnav');

  if (burger && mnav) {
    const behind = ['main', '.ftr'].map((s) => $(s)).filter(Boolean);

    const setMenu = (open) => {
      mnav.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      if (hdr) hdr.classList.toggle('is-open', open);
      d.body.classList.toggle('is-locked', open);
      behind.forEach((el) => { el.inert = open; });
      if (open) { const first = $('a', mnav); if (first) first.focus(); }
    };

    burger.addEventListener('click', () => setMenu(mnav.hidden));
    mnav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', (e) => {
      if (mnav.hidden) return;
      if (e.key === 'Escape') { setMenu(false); burger.focus(); return; }
      if (e.key !== 'Tab') return;
      // Odağı menü + menü düğmesi içinde tut
      const items = [burger, ...$$('a, button', mnav)];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // CSS kırılımıyla aynı sorgu: masaüstüne geçince açık menüyü kapat
    window.matchMedia('(max-width: 1180px)').addEventListener('change', (e) => { if (!e.matches && !mnav.hidden) setMenu(false); });
  }

  /* ---------- Kaydırınca belirme ---------- */
  const rv = $$('.rv');
  if (hasIO) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach((el) => io.observe(el));
  } else {
    rv.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Sayaçlar ---------- */
  const nf = new Intl.NumberFormat('tr-TR');
  const counters = $$('[data-count]');

  const runCount = (el, delay = 0) => {
    const target = Number(el.dataset.count);
    const dur = 1500;
    const t0 = performance.now() + delay;
    const tick = (now) => {
      const p = Math.min(Math.max((now - t0) / dur, 0), 1);
      el.textContent = nf.format(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (hasIO) {
    // Son değerden sıfıra "zıplama" olmasın diye baştan sıfırla (JS yoksa HTML'deki son değer görünür)
    counters.forEach((el) => { el.textContent = nf.format(0); });
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        // Hero rakamları, giriş animasyonu bittikten sonra saymaya başlar
        runCount(en.target, en.target.closest('.hstats') ? 1000 : 0);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- Üretim adımları (sekme deseni) ---------- */
  $$('[data-steps]').forEach((box) => {
    const list = $('.steps__list', box);
    const tabs = $$('.steps__tab', box);
    const panels = tabs.map((t) => d.getElementById(t.getAttribute('href').slice(1)));
    if (!list || !tabs.length || panels.some((p) => !p)) return;

    list.setAttribute('role', 'tablist');
    const vertical = window.matchMedia('(min-width: 981px)');
    const setOrientation = () => list.setAttribute('aria-orientation', vertical.matches ? 'vertical' : 'horizontal');
    setOrientation();
    vertical.addEventListener('change', setOrientation);

    tabs.forEach((t, i) => {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].tabIndex = 0;
    });

    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.toggle('is-on', on);
        if (!on) { const v = $('video', panels[k]); if (v) v.pause(); }
      });
      if (focus) tabs[i].focus();
      if (list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: tabs[i].offsetLeft - list.offsetLeft - 16, behavior: reduce.matches ? 'auto' : 'smooth' });
      }
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', (e) => { e.preventDefault(); select(i); });
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        else if (e.key === ' ') { e.preventDefault(); select(i); return; }
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });

    select(0);
  });

  /* Adım içi video: yalnızca kullanıcı isteyince oynar */
  $$('[data-step-play]').forEach((btn) => {
    const v = $('video', btn.parentElement);
    const icon = $('use', btn);
    if (!v) return;
    const sync = () => {
      btn.setAttribute('aria-label', v.paused ? 'Videoyu oynat' : 'Videoyu duraklat');
      if (icon) icon.setAttribute('href', v.paused ? '#i-play' : '#i-pause');
    };
    btn.addEventListener('click', () => { if (v.paused) v.play().catch(() => {}); else v.pause(); });
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    sync();
  });

  /* ---------- Hareket denetimi: hero videosu + kayan şerit + nabız noktası ---------- */
  const heroVideo = $('.hero__video');
  const pauseBtn = $('[data-hero-pause]');
  let motionPaused = saver;
  let heroInView = true;

  const applyMotion = () => {
    root.classList.toggle('is-paused', motionPaused);
    if (heroVideo) {
      if (motionPaused) heroVideo.pause();
      else if (heroInView) heroVideo.play().catch(() => {});
    }
    if (pauseBtn) {
      const label = $('span', pauseBtn);
      const icon = $('use', pauseBtn);
      if (label) label.textContent = motionPaused ? 'Hareketi oynat' : 'Hareketi duraklat';
      if (icon) icon.setAttribute('href', motionPaused ? '#i-play' : '#i-pause');
    }
  };

  if (heroVideo && motionPaused) heroVideo.removeAttribute('autoplay');
  if (pauseBtn) pauseBtn.addEventListener('click', () => { motionPaused = !motionPaused; applyMotion(); });
  applyMotion();

  // Görünmezken hero videosunu durdur (pil ve işlemci tasarrufu)
  if (heroVideo && hasIO) {
    new IntersectionObserver(([en]) => {
      heroInView = en.isIntersecting;
      if (motionPaused) return;
      if (heroInView) heroVideo.play().catch(() => {}); else heroVideo.pause();
    }, { threshold: 0.05 }).observe(heroVideo);
  }

  /* ---------- Tanıtım filmi penceresi ---------- */
  const modal = $('#vmodal');
  if (modal && typeof modal.showModal === 'function') {
    const frame = $('.vmodal__frame', modal);
    const closeBtn = $('[data-video-close]', modal);
    let opener = null;

    const open = (id, from) => {
      opener = from;
      const f = d.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&hl=tr`;
      f.title = 'As Çelik tanıtım filmi';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      frame.replaceChildren(f);
      if (heroVideo) heroVideo.pause();
      modal.showModal();
    };

    $$('[data-video]').forEach((b) => b.addEventListener('click', () => open(b.dataset.video, b)));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    modal.addEventListener('close', () => {
      frame.replaceChildren();
      if (heroVideo && heroInView && !motionPaused) heroVideo.play().catch(() => {});
      if (opener) opener.focus();
    });
  } else {
    // <dialog> desteklenmiyorsa videoyu yeni sekmede aç
    $$('[data-video]').forEach((b) => b.addEventListener('click', () => {
      window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(b.dataset.video)}`, '_blank', 'noopener');
    }));
  }

  /* ---------- Harita (yalnızca istenince yüklenir) ---------- */
  $$('[data-map]').forEach((box) => {
    const btn = $('[data-map-load]', box);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const f = d.createElement('iframe');
      f.src = box.dataset.map;
      f.title = 'As Çelik Samsun fabrikasının haritadaki konumu';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.replaceChildren(f);
      f.focus();
    });
  });

  /* ---------- İletişim formu → e-posta taslağı ---------- */
  const form = $('#teklif');
  if (form) {
    const status = $('.form__status', form);
    const messages = {
      ad: 'Lütfen adınızı ve soyadınızı yazın.',
      eposta: 'Lütfen geçerli bir e-posta adresi yazın (örn. ad@firma.com).',
      mesaj: 'Lütfen mesajınızı yazın.'
    };

    const describedBy = (input, without) => (input.getAttribute('aria-describedby') || '').split(' ').filter((x) => x && x !== without);

    const setError = (input, msg) => {
      const field = input.closest('.field');
      let err = $('.field__err', field);
      if (msg) {
        if (!err) {
          err = d.createElement('span');
          err.className = 'field__err';
          err.id = `${input.id}-err`;
          err.setAttribute('role', 'alert');
          field.appendChild(err);
        }
        err.textContent = msg;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', [...describedBy(input, err.id), err.id].join(' '));
      } else if (err) {
        input.removeAttribute('aria-invalid');
        const rest = describedBy(input, err.id);
        if (rest.length) input.setAttribute('aria-describedby', rest.join(' ')); else input.removeAttribute('aria-describedby');
        err.remove();
      }
    };

    const check = (input) => {
      const ok = input.value.trim() !== '' && input.checkValidity();
      setError(input, ok ? '' : messages[input.name]);
      return ok;
    };

    const required = $$('[required]', form);
    required.forEach((input) => {
      input.addEventListener('blur', () => check(input));
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) check(input); });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = required.filter((input) => !check(input));
      if (bad.length) {
        if (status) status.textContent = 'Formda eksik veya hatalı alanlar var. Lütfen işaretli alanları düzeltin.';
        bad[0].focus();
        return;
      }
      const v = Object.fromEntries(new FormData(form).entries());
      const subject = `${v.konu}${v.firma.trim() ? ' — ' + v.firma.trim() : ''}`;
      const lines = [v.mesaj.trim(), '', '—', `Ad Soyad: ${v.ad.trim()}`];
      if (v.firma.trim()) lines.push(`Firma: ${v.firma.trim()}`);
      lines.push(`E-posta: ${v.eposta.trim()}`);
      if (v.tel.trim()) lines.push(`Telefon: ${v.tel.trim()}`);
      const href = `mailto:info@ascelik.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      const plain = `Konu: ${subject}\n\n${lines.join('\n')}`;
      if (status) status.textContent = 'Mesajınız e-posta uygulamanızda açılıyor.';
      const done = $('.form__done', form);
      if (done) {
        done.hidden = false;
        $('[data-mail-again]', done).href = href;
        const copyBtn = $('[data-copy-msg]', done);
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(plain);
            copyBtn.textContent = 'Kopyalandı ✓';
          } catch (_) {
            copyBtn.textContent = 'Kopyalanamadı';
          }
        };
      }
      window.location.href = href;
    });
  }

  /* ---------- Etkin menü bağlantısı ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  const linked = navLinks.map((a) => d.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  // Hero ve #iletisim menüde yok; oralara gelince vurgu temizlensin diye onlar da izlenir
  const watched = [$('.hero'), ...linked, d.getElementById('iletisim')].filter(Boolean);
  if (hasIO && linked.length) {
    const nio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        navLinks.forEach((a) => a.classList.toggle('is-active', Boolean(id) && a.getAttribute('href') === `#${id}`));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    watched.forEach((s) => nio.observe(s));
  }

  /* ---------- Yıl ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
