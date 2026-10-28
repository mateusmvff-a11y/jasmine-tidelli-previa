(function(){
  var MANU_WHATSAPP    = "557131909470";
  var CAPTURE_ENDPOINT = "https://app.tidelli.com/api/lp/capture";
  var MENSAGEM_PADRAO  = "Olá! Vim da página da Coleção Jasmine e quero saber mais sobre as cores e configurações disponíveis.";
  // TODO Google Ads: colar o rótulo da conversão de Lead ESPECÍFICA da Jasmine (só o que vem depois da barra, ex.: "aB3cD..."). Enquanto vazio, a conversão do GAds NÃO dispara (Meta e Pinterest já disparam normalmente).
  var GADS_LEAD_LABEL  = "Q-G5CPW0pMwcELu604AD";
  var PROD = location.hostname === "jasmine.tidelli.com"; // fora do domínio real (localhost, prévia) nada é enviado
  var UTM_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gclid","fbclid"];

  function captureUTM(){
    var p = new URLSearchParams(location.search), out = {}, has = false;
    UTM_KEYS.forEach(function(k){ var v = p.get(k); if(v){ out[k] = v; has = true; } });
    try{
      if(has) localStorage.setItem("tdl_utm_jasmine", JSON.stringify(out));
      else { var s = localStorage.getItem("tdl_utm_jasmine"); if(s) out = JSON.parse(s); }
    }catch(e){}
    return out;
  }
  var UTM = captureUTM();

  // conta a visita (1x por sessão) pro funil no painel
  (function(){
    try{
      if(!PROD) return;
      if(sessionStorage.getItem("tdl_visit_jasmine")) return;
      sessionStorage.setItem("tdl_visit_jasmine", "1");
      var vurl = CAPTURE_ENDPOINT.replace(/\/capture$/, "/visit");
      var vp = { path: location.pathname, referrer: document.referrer || "", url: location.href };
      UTM_KEYS.forEach(function(k){ if(UTM[k]) vp[k] = UTM[k]; });
      var vb = JSON.stringify(vp);
      if(!PROD){} else if(navigator.sendBeacon){ navigator.sendBeacon(vurl, new Blob([vb], {type:"text/plain;charset=UTF-8"})); }
      else { fetch(vurl, {method:"POST", headers:{"Content-Type":"text/plain;charset=UTF-8"}, body:vb, keepalive:true}).catch(function(){}); }
    }catch(e){}
  })();

  var modal = document.getElementById("lead-modal");
  var form  = document.getElementById("lead-form");
  var phone = document.getElementById("lead-phone");
  var err   = document.getElementById("lead-err");
  var lastFocus = null;

  function openModal(){ lastFocus = document.activeElement; modal.classList.add("open"); modal.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; setTimeout(function(){ phone.focus(); },60); }
  function closeModal(){ modal.classList.remove("open"); modal.setAttribute("aria-hidden","true"); document.body.style.overflow=""; if(lastFocus) lastFocus.focus(); }

  // FORM: o CTA abre o form popup DIRETO (um overlay só); o form coleta o telefone e dispara os pixels via postMessage.
  document.querySelectorAll("[data-lead]").forEach(function(b){ b.addEventListener("click", function(e){ e.preventDefault(); if(window.abrirFormManu){ window.abrirFormManu({utm: UTM}); } else { openModal(); } }); });
  // dispara os pixels de conversão + captura no funil quando o form (no iframe) coleta o telefone
  function fireLeadTracking(whats){
    var eventId = "jas-" + Date.now() + "-" + Math.random().toString(36).slice(2,9);
    var payload = { whatsapp: whats, empresa: "", origem: "lp-jasmine", event_id: eventId, url: location.href, referrer: document.referrer || "", ts: new Date().toISOString() };
    UTM_KEYS.forEach(function(k){ if(UTM[k]) payload[k] = UTM[k]; });
    try{ var body = JSON.stringify(payload); if(!PROD){} else if(navigator.sendBeacon){ navigator.sendBeacon(CAPTURE_ENDPOINT, new Blob([body], {type:"text/plain;charset=UTF-8"})); } else { fetch(CAPTURE_ENDPOINT, {method:"POST", headers:{"Content-Type":"text/plain;charset=UTF-8"}, body:body, keepalive:true}).catch(function(){}); } }catch(e){}
    try{ if(window.pintrk){ var pev = { lead_type: "Coleção Jasmine" }; UTM_KEYS.forEach(function(k){ if(UTM[k]) pev[k] = UTM[k]; }); window.pintrk("track", "lead", pev); } }catch(e){}
    try{ if(window.fbq){ window.fbq("track", "Lead", { content_name: "Coleção Jasmine" }, { eventID: eventId }); } }catch(e){}
    try{ if(window.gtag && GADS_LEAD_LABEL){ window.gtag("event", "conversion", { send_to: "AW-806673723/" + GADS_LEAD_LABEL, value: 1.0, currency: "BRL", transaction_id: eventId }); } }catch(e){}
  }
  var _tracked = false;
  window.addEventListener("message", function(e){ if(e.data && e.data.manuForm === "lead" && e.data.whatsapp && !_tracked){ _tracked = true; fireLeadTracking(String(e.data.whatsapp)); } });
  modal.querySelectorAll("[data-close]").forEach(function(b){ b.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && modal.classList.contains("open")) closeModal(); });

  var ddi = document.getElementById("lead-ddi");
  function maskPhone(){
    var isBR = ddi.value === "55";
    // máscara BR (DDD + número, 11 díg.) só pro Brasil; outros países = só dígitos,
    // limitados pra o total (DDI + número) não passar de 15 (padrão E.164).
    var max = isBR ? 11 : Math.max(6, 15 - ddi.value.length);
    var d = phone.value.replace(/\D/g,"").slice(0,max), out = d;
    if(isBR){
      if(d.length > 2) out = "(" + d.slice(0,2) + ") " + d.slice(2);
      if(d.length > 7) out = "(" + d.slice(0,2) + ") " + d.slice(2,7) + "-" + d.slice(7);
    }
    phone.value = out;
  }
  phone.addEventListener("input", maskPhone);
  ddi.addEventListener("change", function(){
    phone.placeholder = ddi.value === "55" ? "(11) 90000-0000" : "número, só dígitos";
    maskPhone();
  });

  var enviando = false;
  var submitBtn = form.querySelector('[type="submit"]');
  form.addEventListener("submit", function(e){
    e.preventDefault(); err.textContent = "";
    if(enviando) return; // trava double-submit (clique duplo / Enter repetido)
    var d = phone.value.replace(/\D/g,"");
    var isBR = ddi.value === "55";
    if(d.length < (isBR ? 10 : 6)){ err.textContent = isBR ? "Informe um WhatsApp válido, com DDD." : "Informe um número válido."; phone.focus(); return; }
    enviando = true;
    if(submitBtn){ submitBtn.disabled = true; submitBtn.style.opacity = "0.6"; submitBtn.style.cursor = "default"; }
    var whats = ddi.value + d; // DDI (padrão 55) + número local
    // event_id compartilhado: o MESMO id vai no pixel (eventID), no CAPI (event_id no
    // payload) e no gtag (transaction_id) → o Meta deduplica pixel + CAPI e conta 1 lead.
    var eventId = "jas-" + Date.now() + "-" + Math.random().toString(36).slice(2,9);
    var payload = {
      whatsapp: whats,
      empresa: (document.getElementById("lead-hp").value || ""),
      origem: "lp-jasmine",
      event_id: eventId,
      url: location.href, referrer: document.referrer || "", ts: new Date().toISOString()
    };
    UTM_KEYS.forEach(function(k){ if(UTM[k]) payload[k] = UTM[k]; });
    try{
      var body = JSON.stringify(payload);
      if(!PROD){} else if(navigator.sendBeacon){ navigator.sendBeacon(CAPTURE_ENDPOINT, new Blob([body], {type:"text/plain;charset=UTF-8"})); }
      else { fetch(CAPTURE_ENDPOINT, {method:"POST", headers:{"Content-Type":"text/plain;charset=UTF-8"}, body:body, keepalive:true}).catch(function(){}); }
    }catch(e){}

    // conversões de anúncio (mesmos pixels da Torcida) · evento nomeado "Coleção Jasmine"
    try{
      if(window.pintrk){
        var pev = { lead_type: "Coleção Jasmine" };
        UTM_KEYS.forEach(function(k){ if(UTM[k]) pev[k] = UTM[k]; });
        window.pintrk("track", "lead", pev);
      }
    }catch(e){}
    try{ if(window.fbq){ window.fbq("track", "Lead", { content_name: "Coleção Jasmine" }, { eventID: eventId }); } }catch(e){}
    try{ if(window.gtag && GADS_LEAD_LABEL){ window.gtag("event", "conversion", { send_to: "AW-806673723/" + GADS_LEAD_LABEL, value: 1.0, currency: "BRL", transaction_id: eventId }); } }catch(e){}

    var waUrl = "https://wa.me/" + MANU_WHATSAPP + "?text=" + encodeURIComponent(MENSAGEM_PADRAO);
    setTimeout(function(){ closeModal(); if(window.abrirFormManu){ window.abrirFormManu({phone: whats, utm: UTM}); } else { window.location.href = waUrl; } }, 300); // Manu 3.0 (FORM): abre o formulário popup já com o telefone (fallback = WhatsApp)
  });

  // Voltar do WhatsApp (bfcache) restaura a página com o botão travado — destrava.
  window.addEventListener("pageshow", function(ev){
    if(ev.persisted){ enviando = false; if(submitBtn){ submitBtn.disabled = false; submitBtn.style.opacity = ""; submitBtn.style.cursor = ""; } }
  });
})();

/* sticky CTA aparece depois de rolar o hero */
(function(){
  var bar = document.getElementById("stickyCta");
  if(!bar) return;
  function onScroll(){ if(window.scrollY > window.innerHeight * 0.9) bar.classList.add("show"); else bar.classList.remove("show"); }
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();
  function reserve(){ document.body.style.paddingBottom = bar.classList.contains("show") ? bar.offsetHeight + "px" : "0"; }
  window.addEventListener("resize", reserve);
})();

/* carrossel das peças: auto-slide + setas + pontinhos; pausa ao interagir */
(function(){
  document.querySelectorAll(".peca .pic-wrap").forEach(function(wrap){
    var pic = wrap.querySelector(".pic");
    var imgs = pic ? pic.querySelectorAll("img") : [];
    if(!pic || imgs.length < 2) return;
    var dots = wrap.querySelector(".pic-dots");
    var idx = 0, n = imgs.length, timer = null;
    if(dots){ for(var i=0;i<n;i++){ var d=document.createElement("i"); if(i===0) d.className="on"; dots.appendChild(d); } }
    function paint(){ if(dots){ dots.querySelectorAll("i").forEach(function(d,i){ d.className = i===idx ? "on" : ""; }); } }
    function go(i){ idx = (i + n) % n; pic.scrollTo({ left: idx * pic.clientWidth, behavior: "smooth" }); paint(); }
    function start(){ stop(); timer = setInterval(function(){ go(idx + 1); }, 4000); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    var next = wrap.querySelector(".next"), prev = wrap.querySelector(".prev");
    if(next) next.addEventListener("click", function(){ stop(); go(idx + 1); start(); });
    if(prev) prev.addEventListener("click", function(){ stop(); go(idx - 1); start(); });
    var st; pic.addEventListener("scroll", function(){ clearTimeout(st); st = setTimeout(function(){ idx = Math.round(pic.scrollLeft / pic.clientWidth); paint(); }, 120); });
    wrap.addEventListener("pointerenter", stop);
    wrap.addEventListener("pointerleave", start);
    pic.addEventListener("pointerdown", stop);
    if("IntersectionObserver" in window){
      new IntersectionObserver(function(es){ es.forEach(function(e){ e.isIntersecting ? start() : stop(); }); }, { threshold: 0.3 }).observe(wrap);
    } else { start(); }
  });
})();

/* reveal on scroll + lens zoom (origem segue o cursor) — vanilla, leve */
(function(){
  var SEL='.grid2>*,.duo>*,#textura .wrap>*,.marquee,#pecas .wrap>*,.gallery,#contato .wrap>*,.sec-cremeb .wrap>*';
  var els=[].slice.call(document.querySelectorAll(SEL));
  els.forEach(function(el){
    var p=el.parentNode; if(!p) return;
    var sibs=[].slice.call(p.children).filter(function(c){return els.indexOf(c)>=0;});
    var i=sibs.indexOf(el);
    if(i>0) el.style.transitionDelay=Math.min(i*90,360)+'ms';
  });
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(reduce){els.forEach(function(el){el.classList.add('is-in');});}
  else{
    var pending=els.slice();
    function reveal(){
      var vh=window.innerHeight||document.documentElement.clientHeight;
      for(var i=pending.length-1;i>=0;i--){
        var r=pending[i].getBoundingClientRect();
        if(r.top<vh*0.9 && r.bottom>0){pending[i].classList.add('is-in');pending.splice(i,1);}
      }
    }
    var tick=false;
    function onScroll(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;reveal();});}
    window.__jasmineReveal=reveal;
    reveal();
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);var k=pending.indexOf(e.target);if(k>=0)pending.splice(k,1);}});},{threshold:0.1,rootMargin:'0px 0px -8% 0px'});
      els.forEach(function(el){io.observe(el);});
    }
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll,{passive:true});
    document.addEventListener('scroll',onScroll,{passive:true,capture:true});
  }
  document.querySelectorAll('.gallery figure').forEach(function(box){
    var img=box.querySelector('img'); if(!img) return;
    box.addEventListener('mousemove',function(e){var r=box.getBoundingClientRect();img.style.transformOrigin=(((e.clientX-r.left)/r.width)*100)+'% '+(((e.clientY-r.top)/r.height)*100)+'%';});
    box.addEventListener('mouseleave',function(){img.style.transformOrigin='center';});
  });
})();

/* menu: marca a seção em que a pessoa está */
(function(){
  var links = [].slice.call(document.querySelectorAll('.nav .links a[href^="#"]:not(.nav-contato)'));
  var alvos = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  function marca(){
    var y = window.scrollY + 140, atual = -1, topo = -1;
    alvos.forEach(function(s,i){ if(s && s.offsetTop <= y && s.offsetTop > topo){ topo = s.offsetTop; atual = i; } });
    links.forEach(function(a,i){ a.classList.toggle('on', i === atual); });
  }
  window.addEventListener('scroll', marca, {passive:true}); marca();
})();
