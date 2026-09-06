(() => {
  'use strict';

  const stops = [...document.querySelectorAll('.stop[data-chapter]')];
  const chapters = [...document.querySelectorAll('[data-story-chapter]')];

  if (stops.length === 0 || chapters.length === 0) {
    return;
  }

  document.documentElement.classList.add('story-enhanced');

  let frame = 0;
  let activeChapter = '';

  const activate = (chapterId) => {
    if (!chapterId || activeChapter === chapterId) {
      return;
    }

    activeChapter = chapterId;
    stops.forEach((stop) => {
      const isActive = stop.dataset.chapter === chapterId;
      stop.classList.toggle('active', isActive);
      if (isActive) {
        stop.setAttribute('aria-current', 'step');
      } else {
        stop.removeAttribute('aria-current');
      }
    });
  };

  const syncStoryline = () => {
    frame = 0;
    const focusLine = window.innerHeight * 0.42;
    let closest = chapters[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    chapters.forEach((chapter) => {
      const rect = chapter.getBoundingClientRect();
      const distance = rect.top <= focusLine && rect.bottom >= focusLine
        ? 0
        : Math.min(Math.abs(rect.top - focusLine), Math.abs(rect.bottom - focusLine));

      chapter.classList.toggle('chapter-visible', rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.12);
      if (distance < closestDistance) {
        closest = chapter;
        closestDistance = distance;
      }
    });

    activate(closest.dataset.storyChapter);
  };

  const scheduleSync = () => {
    if (!frame) {
      frame = window.requestAnimationFrame(syncStoryline);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(scheduleSync, {
      rootMargin: '-12% 0px -12% 0px',
      threshold: [0, 0.2, 0.45, 0.7, 1],
    });
    chapters.forEach((chapter) => observer.observe(chapter));
  }

  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync, { passive: true });
  syncStoryline();
})();
