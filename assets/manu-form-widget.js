/* Manu 3.0 — POPUP do formulário (typeform) pra embutir em qualquer LP.
   Abre o /manu-form/ dentro de um modal (iframe isolado — não conflita com o CSS da LP).
   Autocontido: injeta CSS + DOM e expõe window.abrirFormManu(opts).
   Uso: <script src="/assets/manu-form-widget.js?v=..."></script>
        <button onclick="abrirFormManu({utm_source:'meta',utm_campaign:'jasmine'})">Falar com a Manu</button> */
(function () {
  // relativo por padrão (mesma origem da LP → postMessage seguro); override via window.MANU_FORM_URL
  var FORM_URL = window.MANU_FORM_URL || "/manu-form/";
  var CSS = [
    // popup em TELA INTEIRA (cobre a LP toda), fundo creme da marca
    ".mfw{position:fixed;inset:0;z-index:99998;display:none;background:#F7F1E4}",
    ".mfw.open{display:block;animation:mfwFade .3s ease both}",
    ".mfw-card{position:absolute;inset:0;overflow:hidden;background:#F7F1E4;animation:mfwIn .4s cubic-bezier(.22,.61,.36,1) both}",
    ".mfw-x{position:absolute;top:calc(14px + env(safe-area-inset-top));right:calc(16px + env(safe-area-inset-right));z-index:2;width:38px;height:38px;border-radius:50%;background:rgba(24,69,62,.10);",
    "border:0;color:#18453E;font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}",
    ".mfw-x:hover{background:rgba(24,69,62,.2)}",
    ".mfw-frame{width:100%;height:100%;border:0;display:block;background:#F7F1E4}",
    "@keyframes mfwFade{from{opacity:0}to{opacity:1}}",
    "@keyframes mfwIn{from{opacity:0;transform:scale(.99)}to{opacity:1;transform:none}}",
    "@media (prefers-reduced-motion:reduce){.mfw.open,.mfw-card{animation:none!important}}",
  ].join("");
  var st = document.createElement("style");
  st.textContent = CSS;
  document.head.appendChild(st);

  var host = document.createElement("div");
  host.innerHTML =
    '<div id="manu-form" class="mfw" role="dialog" aria-modal="true" aria-label="Fale com a Manu — Tidelli">' +
    '<div class="mfw-card">' +
    '<button class="mfw-x" type="button" aria-label="Fechar">&times;</button>' +
    '<iframe class="mfw-frame" id="mfw-frame" title="Fale com a Manu — Tidelli" allow="clipboard-write"></iframe>' +
    "</div></div>";
  document.body.appendChild(host.firstChild);

  var el = document.getElementById("manu-form"),
    frame = document.getElementById("mfw-frame");

  function abrir(opts) {
    opts = opts || {};
    // aceita {utm_source,utm_medium,...} OU {source,medium,...} OU {utm:{...}}
    var u = opts.utm || opts;
    var qs = new URLSearchParams();
    var map = { utm_source: u.utm_source || u.source, utm_medium: u.utm_medium || u.medium, utm_campaign: u.utm_campaign || u.campaign, utm_content: u.utm_content || u.content, utm_term: u.utm_term || u.term };
    for (var k in map) { if (map[k]) qs.set(k, map[k]); }
    // telefone já coletado pela LP (opcional) → o form pula a tela de telefone
    if (opts.phone) { var ph = String(opts.phone).replace(/\D/g, ""); if (ph) qs.set("phone", ph); }
    var q = qs.toString();
    frame.src = FORM_URL + (q ? "?" + q : "");
    el.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function fechar() {
    el.classList.remove("open");
    document.body.style.overflow = "";
    // zera o iframe: para o form e reseta pro próximo abrir (a persistência resume se não concluiu)
    setTimeout(function () { if (!el.classList.contains("open")) frame.src = "about:blank"; }, 260);
  }

  window.abrirFormManu = abrir;
  window.fecharFormManu = fechar;
  el.querySelector(".mfw-x").addEventListener("click", fechar);
  // o form (dentro do iframe) manda "close" quando o cliente clica em Fechar no fim
  window.addEventListener("message", function (e) {
    if (e.data && e.data.manuForm === "close") fechar();
  });
  // ESC fecha (a persistência guarda o progresso; reabrir resume)
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && el.classList.contains("open")) fechar();
  });
})();
