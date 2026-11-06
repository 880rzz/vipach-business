
  /* Shared visual/runtime additions */
  (function(){
    const addScript=(src)=>{const s=document.createElement('script');s.src=src;s.defer=true;document.head.appendChild(s);};
    const addStyle=(href)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);};
    addStyle('/assets/typography-refinement.css?v=20261106-1');
    addScript('/assets/whatsapp-fab.js?v=20260828-1');
  })();

  /* Stable language URLs: / is HU, /en/ is EN, /de-at/ is DE-AT.
     Do not redirect by browser language: each locale must remain directly
     addressable and match its declared canonical/hreflang URL. */
  (function(){
    const STORAGE_KEY='vipachPreferredLanguage';
    document.querySelectorAll('.nav-language a,.langs a').forEach(link=>{
      link.addEventListener('click',()=>{
        const href=link.getAttribute('href') || '';
        const lang=href.startsWith('/de-at') ? 'de' : href.startsWith('/en') ? 'en' : 'hu';
        try { localStorage.setItem(STORAGE_KEY,lang); } catch (_) {}
      });
    });
  })();

(function(){
  const hamb=document.getElementById('hamb');
  const mobile=document.getElementById('mobile');
  if(hamb&&mobile){hamb.addEventListener('click',()=>{const open=mobile.classList.toggle('open');hamb.setAttribute('aria-expanded',String(open));});mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobile.classList.remove('open');hamb.setAttribute('aria-expanded','false');}));}

  document.querySelectorAll('.hero-media').forEach(hero=>{
    const video=hero.querySelector('.hero-bg-video');
    if(!video) return;
    const reduced=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile=()=>window.matchMedia && window.matchMedia('(max-width: 920px)').matches;
    let hydrated=false;
    video.muted=true;
    video.playsInline=true;
    video.setAttribute('muted','');
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    const activate=()=>hero.classList.add('is-video-active');
    const hydrateVideo=()=>{
      if(hydrated || isMobile() || reduced) return false;
      video.querySelectorAll('source[data-src]').forEach(source=>{
        source.src=source.dataset.src;
        source.removeAttribute('data-src');
      });
      hydrated=true;
      return true;
    };
    const playVideo=()=>{
      if(reduced || isMobile()) return;
      if(hydrateVideo()){try{video.load();}catch(err){}}
      const p=video.play();
      if(p && typeof p.then==='function'){
        p.then(activate).catch(()=>hero.classList.remove('is-video-active'));
      }else{
        activate();
      }
    };
    const stopVideo=()=>{
      if(isMobile()) return;
      hero.classList.remove('is-video-active');
      try{video.pause();video.currentTime=0;}catch(err){}
    };
    hero.addEventListener('mouseenter',playVideo);
    hero.addEventListener('mouseleave',stopVideo);
    hero.addEventListener('focusin',playVideo);
    hero.addEventListener('focusout',e=>{ if(!hero.contains(e.relatedTarget)) stopVideo(); });
  });
  document.querySelectorAll('form[data-script-form="true"]').forEach(form=>{
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(form.querySelector('[name="website_hp"]')?.value) return;
      if(!form.checkValidity()){form.reportValidity();return;}
      const btn=form.querySelector('button[type="submit"]');
      const original=btn?btn.textContent:'';
      if(btn){btn.disabled=true;btn.textContent=btn.dataset.loading||'Küldés…';}
      const data=new FormData(form);
      const submittedAt=new Date().toISOString();
      data.append('page',location.origin + location.pathname);
      data.append('page_url',location.origin + location.pathname);
      data.append('submitted_at',submittedAt);
      data.append('processing_context','GitHub Pages static hosting; Google Apps Script / Google Workspace form relay; privacy version '+(form.querySelector('[name="privacy_version"]')?.value||''));
      if(data.get('gdpr')){
        data.append('gdpr_accepted_at',submittedAt);
        data.append('gdpr_acceptance_text',(form.querySelector('[data-gdpr-text="true"]')?.textContent||'').trim());
      }
      try{await fetch(form.action,{method:'POST',body:data,mode:'no-cors'});}
      catch(err){
        console.warn('Form relay network failure',err);
        if(btn){btn.disabled=false;btn.textContent=original;}
        const message=form.querySelector('.form-error-message') || document.createElement('p');
        message.className='form-error-message';
        message.setAttribute('role','alert');
        message.textContent=document.documentElement.lang.startsWith('de')?'Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.':document.documentElement.lang.startsWith('en')?'The request could not be submitted. Please try again.':'A kérés nem továbbítható. Kérjük, próbálja újra.';
        if(!message.parentElement) form.appendChild(message);
        return;
      }
      // An opaque no-cors response does not confirm server-side receipt.
      // Keep the submitted data intact so the visitor can retry or use another contact method.
      const ok=form.querySelector('.success-banner');
      if(ok){
        ok.textContent=document.documentElement.lang.startsWith('de')?'Die Übermittlung wurde im Browser gestartet. Eine Bestätigung des Eingangs ist technisch nicht verfügbar. Falls Sie keine Rückmeldung erhalten, kontaktieren Sie uns bitte direkt.':document.documentElement.lang.startsWith('en')?'Your browser initiated the request, but receipt cannot be confirmed. If you do not hear from us, please contact us directly.':'A böngésző elindította a beküldést, de a beérkezés nem igazolható. Ha nem kap választ, kérjük, keressen bennünket közvetlenül.';
        ok.setAttribute('role','status');
        ok.classList.add('show');
      }
      if(btn){btn.disabled=false;btn.textContent=original;}
    });
  });
})();

/* ============================================================
   FINOM MOZGÁSRÉTEG (Apple-szerű) — progresszív ráépülés.
   JS nélkül az oldal teljesen működik és minden látható.
   ============================================================ */
(function(){
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var root = document.documentElement;
  root.classList.add('js-anim');

  var selectors = [
    '.section-head',
    '.deliverable',
    '.text-panel', '.black-panel',
    '.panel',
    '.step',
    '.quote p',
    '.form-wrap'
  ];
  var nodes = [];
  selectors.forEach(function(sel){
    document.querySelectorAll(sel).forEach(function(el){
      if (el.closest('.hero-content')) return;
      el.classList.add('reveal');
      nodes.push(el);
    });
  });

  function applyStagger(){
    var groups = {};
    nodes.forEach(function(el){
      var parent = el.parentElement;
      var key = parent ? (parent.className || 'x') : 'x';
      (groups[key] = groups[key] || []).push(el);
    });
    Object.keys(groups).forEach(function(k){
      groups[k].forEach(function(el, i){
        el.style.transitionDelay = Math.min(i * 70, 280) + 'ms';
      });
    });
  }
  applyStagger();

  if (!('IntersectionObserver' in window)){
    nodes.forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  nodes.forEach(function(el){ io.observe(el); });

  requestAnimationFrame(function(){
    nodes.forEach(function(el){
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.classList.add('is-visible');
    });
  });
})();
