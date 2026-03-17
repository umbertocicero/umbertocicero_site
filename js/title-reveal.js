/**
 * Title Reveal — per-character staggered slide-up animation.
 *
 * Splits each .section-title into individual characters wrapped
 * in clipped containers, then animates them upward from below
 * with staggered timing on scroll — inspired by modern portfolio sites.
 *
 * Each character starts at translate3d(0, 1.2em, 0) rotate(5deg)
 * and slides up to translate3d(0, 0, 0) rotate(0deg).
 * The parent has overflow:hidden so they appear to emerge from below.
 */
(function () {
  'use strict';

  /* ─── Config ─────────────────────────────────────────────────────────── */
  var CHAR_STAGGER   = 0.025;  // seconds between each char
  var ANIM_DURATION  = 0.8;    // seconds per char animation
  var TRANSLATE_Y    = '1.2em';
  var ROTATE_START   = 5;      // degrees
  var EASING         = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var THRESHOLD      = 0.15;   // IntersectionObserver threshold

  /* ─── Split text into word > char structure ──────────────────────────── */
  function splitTitle(el) {
    var text = el.textContent.trim();
    el.textContent = '';
    el.setAttribute('aria-label', text);

    var words = text.split(/\s+/);

    words.forEach(function (word, wi) {
      var wordDiv = document.createElement('div');
      wordDiv.className = 'title-word';
      wordDiv.style.display = 'inline-block';
      wordDiv.style.overflow = 'hidden';
      wordDiv.style.verticalAlign = 'top';

      var chars = word.split('');
      chars.forEach(function (char, ci) {
        var charDiv = document.createElement('div');
        charDiv.className = 'title-char';
        charDiv.style.display = 'inline-block';
        charDiv.style.transform = 'translate3d(0,' + TRANSLATE_Y + ',0) rotate(' + ROTATE_START + 'deg)';
        charDiv.style.willChange = 'transform';
        charDiv.textContent = char;
        wordDiv.appendChild(charDiv);
      });

      el.appendChild(wordDiv);

      // Add space between words (not after last)
      if (wi < words.length - 1) {
        var space = document.createElement('div');
        space.className = 'title-word';
        space.style.display = 'inline-block';
        space.style.width = '0.3em';
        el.appendChild(space);
      }
    });

    return el.querySelectorAll('.title-char');
  }

  /* ─── Animate chars in ──────────────────────────────────────────────── */
  function revealChars(chars) {
    for (var i = 0; i < chars.length; i++) {
      (function (charEl, index) {
        var delay = index * CHAR_STAGGER;
        charEl.style.transition = 'transform ' + ANIM_DURATION + 's ' + EASING + ' ' + delay + 's';
        // Force reflow before setting final transform
        void charEl.offsetWidth;
        charEl.style.transform = 'translate3d(0,0,0) rotate(0deg)';
      })(chars[i], i);
    }
  }

  /* ─── Animate chars out (reverse) ───────────────────────────────────── */
  function hideChars(chars) {
    for (var i = 0; i < chars.length; i++) {
      (function (charEl, index) {
        // Reverse: last char first
        var reverseIndex = chars.length - 1 - index;
        var delay = reverseIndex * (CHAR_STAGGER * 0.5);
        charEl.style.transition = 'transform ' + (ANIM_DURATION * 0.6) + 's ' + EASING + ' ' + delay + 's';
        charEl.style.transform = 'translate3d(0,' + TRANSLATE_Y + ',0) rotate(' + ROTATE_START + 'deg)';
      })(chars[i], i);
    }
  }

  /* ─── Init ───────────────────────────────────────────────────────────── */
  function init() {
    var titles = Array.prototype.slice.call(
      document.querySelectorAll('.section-title')
    );
    if (!titles.length) return;

    var titleData = [];

    titles.forEach(function (el) {
      var chars = splitTitle(el);
      titleData.push({ el: el, chars: chars, revealed: false });
    });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          for (var j = 0; j < titleData.length; j++) {
            if (titleData[j].el === entry.target) {
              if (entry.isIntersecting && !titleData[j].revealed) {
                titleData[j].revealed = true;
                revealChars(titleData[j].chars);
              } else if (!entry.isIntersecting && titleData[j].revealed) {
                titleData[j].revealed = false;
                hideChars(titleData[j].chars);
              }
              break;
            }
          }
        });
      }, { threshold: THRESHOLD });

      titles.forEach(function (el) { obs.observe(el); });
    } else {
      // Fallback: reveal all immediately
      titleData.forEach(function (d) { revealChars(d.chars); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
