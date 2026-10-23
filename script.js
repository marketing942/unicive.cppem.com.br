/* =========================================================
   UniCV Caruaru — Pré-venda
   Formulário → Google Sheets → redirect WhatsApp
   ========================================================= */

/* Todos os projetos gravam na MESMA aba da planilha: CPPEM. O ?aba= não
   escolhe a aba de destino — ele identifica QUEM enviou, e o backend usa isso
   para aceitar (ou barrar) o lead e rotular a origem. */
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxdFplWVSfhTjvyIA7HIWb645xRjGNhBVhTdTf5UMjo0lSpW_A_jCuys0qB4uImKXPQ/exec?aba=UNICIVE";

/* ---------- UTMs ----------
   As UTMs só existem na URL do PRIMEIRO acesso. Se a pessoa recarrega, volta
   pelo histórico, ou o link do anúncio cai numa página que redireciona, o
   ?utm_source= já não está mais lá na hora do submit — e o lead chegava na
   planilha sem origem nenhuma. Por isso gravamos assim que a página carrega e
   lemos do storage no envio (first touch). O try/catch cobre navegador com
   storage bloqueado (aba anônima, ITP), onde o comportamento volta a ser o
   antigo em vez de quebrar o formulário. */
const UTM_CAMPOS = ["utm_source", "utm_campaign"];

(function guardarUTMs() {
  const qs = new URLSearchParams(window.location.search);

  UTM_CAMPOS.forEach((chave) => {
    const valor = qs.get(chave);
    if (!valor) return;

    try {
      sessionStorage.setItem(chave, valor);
    } catch (e) {
      /* storage indisponível: segue sem persistir */
    }
  });
})();

function utm(chave) {
  const daUrl = new URLSearchParams(window.location.search).get(chave);
  if (daUrl) return daUrl;

  try {
    return sessionStorage.getItem(chave) || "";
  } catch (e) {
    return "";
  }
}

// WhatsApp direto — (81) 99264-0766 — substitui o antigo link rastreado
const WHATSAPP_NUMERO = "5581992640766";
const WHATSAPP_REDIRECT = `https://wa.me/${WHATSAPP_NUMERO}`;
const WHATSAPP_MSG = "Quero saber mais sobre o superior EAD!";

// Sem Ensino Médio → encaminhar para o supletivo (não vai pro WhatsApp)
const SUPLETIVO_REDIRECT = "https://cppem-supletivo-filiado.vercel.app/";

// Atraso do redirect alinhado ao debounce (1500 ms) da PixelX.
// Abaixo disso, a navegação cancela a requisição do evento de conversão.
const REDIRECT_DELAY_MS = 1500;

/* ---------- Formulário visível na seção de cursos ---------- */
const inlineFormPanel = document.getElementById("inscricao");
const openFormTriggers = document.querySelectorAll("#open-form-btn, .js-open-form");

// Redirect ativo — pode ser sobrescrito pelo gatilho (ex.: cards de curso → grupos)
let activeRedirect = WHATSAPP_REDIRECT;

let applyingPhoneMask = false;
async function applyPhoneMask() {
  if (applyingPhoneMask) return;
  applyingPhoneMask = true;
  try {
    if (window.pixel_x_app && typeof window.pixel_x_app.mask_load === "function") {
      await window.pixel_x_app.mask_load();
    }
  } catch (err) {
    console.warn("[PixelX] mask_load falhou:", err);
  } finally {
    applyingPhoneMask = false;
  }
}

function goToLeadForm(trigger) {
  if (!inlineFormPanel) return;
  activeRedirect =
    (trigger && trigger.dataset && trigger.dataset.redirect) || WHATSAPP_REDIRECT;
  inlineFormPanel.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start"
  });
  const target = document.getElementById("lead_submit")?.disabled
    ? document.getElementById("form-success")
    : document.getElementById("lead_name");
  target?.focus({ preventScroll: true });
  applyPhoneMask();
}

openFormTriggers.forEach((el) => {
  el.addEventListener("click", () => goToLeadForm(el));
  // Suporte a teclado para gatilhos que não são <button> (ex.: cards de curso)
  if (el.tagName !== "BUTTON") {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToLeadForm(el);
      }
    });
  }
});
if (inlineFormPanel) {
  // O visitante pode preencher diretamente, sem passar por um botão.
  inlineFormPanel.addEventListener("focusin", applyPhoneMask);
  window.addEventListener("load", applyPhoneMask, { once: true });
  applyPhoneMask();
}

/* ---------- Navbar revelado ao rolar (abaixo da logo do topo) ---------- */
const navbar = document.getElementById("navbar");
const heroLogo = document.querySelector(".hero-brands");
if (navbar) {
  const revealPoint = () =>
    heroLogo ? heroLogo.offsetTop + heroLogo.offsetHeight - 8 : 120;
  const onScroll = () => {
    navbar.classList.toggle("is-visible", window.scrollY > revealPoint());
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
}

/* ---------- Validação ---------- */
const form = document.getElementById("BfDnaaTxKjfyDfufDkvR");

function fieldOf(name) {
  const input = form?.querySelector(`[name="${name}"]`);
  return input ? input.closest(".field") : null;
}

function setError(name, msg) {
  const field = fieldOf(name);
  const errorEl = form?.querySelector(`[data-error-for="${name}"]`);

  if (field) field.classList.add("invalid");
  if (errorEl) errorEl.textContent = msg;
}

function clearError(name) {
  const field = fieldOf(name);
  const errorEl = form?.querySelector(`[data-error-for="${name}"]`);

  if (field) field.classList.remove("invalid");
  if (errorEl) errorEl.textContent = "";
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Dígitos nacionais (DDD + número), removendo o "+55" que a máscara/PixelX escrevem.
// Não dá para remover pelos dígitos "55" cru — o DDD 55 (Santa Maria/RS) existe.
const phoneDigitsNacional = (v) =>
  v.trim().replace(/^\+\s*55\s*/, "").replace(/\D/g, "");

// Telefone válido: 11 dígitos nacionais e nono dígito ("9") presente.
const isPhone = (v) => {
  const d = phoneDigitsNacional(v);
  return d.length === 11 && d[2] === "9";
};

function validate() {
  let ok = true;

  ["name", "email", "phone", "escolaridade"].forEach(clearError);

  const nome = document.getElementById("lead_name").value.trim();
  const email = document.getElementById("lead_email").value.trim();
  const telValue = document.getElementById("lead_phone").value;
  const escolaridade = document.getElementById("escolaridade").value;

  if (nome.length < 3) {
    setError("name", "Informe seu nome completo.");
    ok = false;
  }

  if (!isEmail(email)) {
    setError("email", "Informe um e-mail válido.");
    ok = false;
  }

  if (!isPhone(telValue)) {
    setError("phone", "Informe um WhatsApp válido com DDD.");
    ok = false;
  }

  if (!escolaridade) {
    setError("escolaridade", "Selecione a escolaridade.");
    ok = false;
  }

  return ok;
}

/* ---------- Envio ---------- */
if (form) {
  const btn = document.getElementById("lead_submit");
  const success = document.getElementById("form-success");
  let enviado = false; // guarda anti-duplicação de Lead

  async function enviarLead() {
    btn.disabled = true;
    btn.textContent = "ENVIANDO...";

    const escolaridadeSelect = document.getElementById("escolaridade");
    const nomeEl = document.getElementById("lead_name");
    const emailEl = document.getElementById("lead_email");
    const phoneEl = document.getElementById("lead_phone");

    // E.164 sem duplicar o país (a máscara/PixelX já escrevem "+55")
    const telE164 = "55" + phoneDigitsNacional(phoneEl.value);

    const payload = {
      name: nomeEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      phone_e164: telE164,
      origem: "UNICIVE",
      pagina_url: window.location.href,
      utm_source: utm("utm_source"),
      utm_campaign: utm("utm_campaign")
    };

    // Backup do lead na planilha. Não bloqueia o redirect: a PixelX já capturou
    // o Lead no submit que acabou de propagar.
    try {
      await fetch(SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[Form] Falha ao salvar na planilha (segue o redirect):", err);
    }

    if (success) {
      form.querySelectorAll(".field, .note").forEach((el) => {
        el.style.display = "none";
      });
      btn.style.display = "none";
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const params = new URLSearchParams({
      text: WHATSAPP_MSG,
      name: nomeEl.value.trim(),
      email: emailEl.value.trim(),
      phone: telE164
    });

    // "Não tenho" Ensino Médio → supletivo; caso contrário, o redirect ativo
    // (WhatsApp direto, ou grupos quando aberto por um card de curso).
    const semEnsinoMedio = escolaridadeSelect.value === "segunda-graduacao";
    const destino = semEnsinoMedio ? SUPLETIVO_REDIRECT : activeRedirect;

    setTimeout(() => {
      window.location.href = `${destino}?${params.toString()}`;
    }, REDIRECT_DELAY_MS);
  }

  // Barreira em fase de CAPTURA no document: roda SEMPRE antes do listener de
  // submit da PixelX. Inválido → mata o evento aqui (PixelX não registra Lead);
  // válido → deixa propagar (PixelX registra o Lead) e nós salvamos + redirecionamos.
  document.addEventListener("submit", (e) => {
    if (e.target !== form) return;

    e.preventDefault(); // nunca recarrega/navega pelo form

    // Já enviado ou inválido → o evento morre aqui, sem chegar na PixelX (sem duplicar)
    if (enviado || !validate()) {
      e.stopImmediatePropagation();
      return;
    }

    enviado = true;
    enviarLead();
  }, true);
}

/* =========================================================
   EXIT POPUP — intenção de saída → comunidade

   ⚠️ REGRA CRÍTICA DE TRACKING
   Este formulário NÃO pode gerar Lead. A PixelX dispara o Lead no submit do
   formulário principal. Se o submit deste popup propagar, o cadastro na
   comunidade é contado como lead de venda e contamina a otimização das
   campanhas. A barreira no fim deste arquivo usa stopImmediatePropagation em
   FASE DE CAPTURA — é isso que impede a regra do painel de alcançar este form.
   ========================================================= */

/* --- Configuração --- */
const EXIT_POPUP_ENABLED = true;    // kill switch — false desliga tudo
const ENABLE_BACK_TRAP   = false;   // intercepta o "voltar" no mobile (invasivo)
const ARM_DELAY          = 8000;    // ms mínimos na página antes de armar
const IDLE_DELAY         = 25000;   // ms de inatividade (mobile)
const SNOOZE_DAYS        = 3;       // dias de silêncio após fechar/enviar
const STORAGE_PREFIX     = "cppem_unicive";

/* Destino do cadastro na comunidade — link rastreado (PixelX, domínio próprio).
   Vazio = cairia no mesmo WhatsApp do formulário principal. */
const COMMUNITY_URL = "https://pxa.cppem.com.br/lt/grupos-unicive";

/* Aba separada na mesma planilha do formulário principal. */
const COMMUNITY_SHEET_URL = SHEET_URL.replace(/\?aba=.*$/, "?aba=UNICIVE_COMUNIDADE");

/* Gatilho mobile: "push" bruto de volta ao topo. Só dispara no gesto inteiro —
   arremesso longo, contínuo, terminando no início da página. */
const SCROLL_UP_MIN_PX = 1200;   // subida mínima acumulada, em px
const SCROLL_UP_MIN_VH = 2;      // ...ou 2 telas cheias, o que for maior
const SCROLL_UP_SPEED  = 1.2;    // px/ms médios (~1200 px/s)
const SCROLL_UP_GAP    = 400;    // ms de pausa que quebram o gesto
const SCROLL_UP_JITTER = 60;     // px de descida tolerados sem zerar o gesto
const SCROLL_UP_TOP    = 200;    // precisa terminar a até N px do topo

const EXIT_KEY_SEEN      = STORAGE_PREFIX + "_exit_seen";
const EXIT_KEY_SNOOZE    = STORAGE_PREFIX + "_exit_snooze";
const EXIT_KEY_CONVERTED = STORAGE_PREFIX + "_lead_converted";

const ExitStore = {
  get(k)     { try { return localStorage.getItem(k); }   catch (e) { return null; } },
  set(k, v)  { try { localStorage.setItem(k, v); }       catch (e) {} },
  sGet(k)    { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  sSet(k, v) { try { sessionStorage.setItem(k, v); }     catch (e) {} }
};

function exitTrack(event, data) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(Object.assign({ event: event }, data || {}));
}

function exitSnooze() {
  ExitStore.set(EXIT_KEY_SNOOZE, String(Date.now() + SNOOZE_DAYS * 86400000));
}

/* --- Elementos --- */
const exitModal = document.getElementById("exit-modal");
const exitForm  = document.getElementById("exit-form");
const exitBtn   = document.getElementById("exit_submit");
const EXIT_FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/* =========================================================
   ExitPopup — detecção, abertura e fechamento
   ========================================================= */
const ExitPopup = {
  open: false,
  fired: false,
  submitted: false,
  armed: false,
  trigger: null,
  lastFocused: null,
  cleanup: [],

  isBlocked() {
    if (ExitStore.get(EXIT_KEY_CONVERTED)) return true;
    if (ExitStore.sGet(EXIT_KEY_SEEN)) return true;
    const until = parseInt(ExitStore.get(EXIT_KEY_SNOOZE) || "0", 10);
    if (until && Date.now() < until) return true;
    // Não interrompe o preenchimento do formulário visível.
    return !!(inlineFormPanel && inlineFormPanel.contains(document.activeElement));
  },

  canFire() {
    return this.armed && !this.fired && !this.open && !this.isBlocked();
  },

  // force ignora as travas — usado só pelo console
  show(why, force) {
    if (!exitModal) return;
    if ((!force && !this.canFire()) || this.open) return;

    this.fired = true;
    this.trigger = why;
    this.open = true;
    ExitStore.sSet(EXIT_KEY_SEEN, "1");

    this.lastFocused = document.activeElement;
    exitModal.hidden = false;
    document.body.classList.add("modal-open");

    const first = exitModal.querySelector("input");
    if (first) setTimeout(() => first.focus(), 60);

    exitTrack("exit_popup_view", { trigger: why });
    this.teardown();
  },

  hide(method) {
    if (!this.open) return;

    if (!this.submitted) {
      exitTrack("exit_popup_close", { trigger: this.trigger, method: method || "x" });
      exitSnooze();
    }

    this.open = false;
    exitModal.hidden = true;
    document.body.classList.remove("modal-open");

    if (this.lastFocused && typeof this.lastFocused.focus === "function") {
      this.lastFocused.focus();
    }
    this.lastFocused = null;
  },

  on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    this.cleanup.push(() => target.removeEventListener(type, handler, opts));
  },

  teardown() {
    this.cleanup.forEach((fn) => fn());
    this.cleanup = [];
  },

  /* Desktop: cursor saindo pelo topo da viewport */
  watchPointer() {
    this.on(document, "mouseout", (e) => {
      if (!e.relatedTarget && e.clientY <= 0) this.show("desktop");
    });
  },

  /* Mobile: inatividade + push bruto ao topo */
  watchMobile() {
    let idleTimer = null;
    let lastY = window.scrollY;
    let lastT = Date.now();
    let burstPx = 0, burstT = 0, burstN = 0;

    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => this.show("inatividade"), IDLE_DELAY);
    };

    this.on(window, "scroll", () => {
      const y = window.scrollY;
      const t = Date.now();
      const subiu = lastY - y;

      // Descidas pequenas (layout shift de imagem carregando) são ignoradas;
      // senão um único evento espúrio mataria o arremesso inteiro.
      if (subiu <= -SCROLL_UP_JITTER) {
        burstPx = 0; burstT = t; burstN = 0;                    // voltou a descer
      } else if (t - lastT > SCROLL_UP_GAP) {
        burstPx = Math.max(0, subiu); burstT = t; burstN = 1;   // gesto novo
      } else if (subiu > 0) {
        burstPx += subiu; burstN++;                             // mesmo gesto
      }

      lastY = y;
      lastT = t;

      const duracao = t - burstT;
      const distancia = Math.max(SCROLL_UP_MIN_PX, window.innerHeight * SCROLL_UP_MIN_VH);

      // burstN >= 2 é obrigatório: com um único evento a duração é ~0 e a
      // velocidade daria infinito, deixando passar rolagem lenta que o browser
      // entregou coalescida. Aqui o falso negativo é preferível.
      if (burstN >= 2 && duracao > 0 &&
          burstPx >= distancia &&
          burstPx / duracao >= SCROLL_UP_SPEED &&
          y <= SCROLL_UP_TOP) {
        this.show("scroll_up");
        return;
      }

      resetIdle();
    }, { passive: true });

    this.on(document, "touchstart", resetIdle, { passive: true });
    this.on(document, "click", resetIdle);
    this.cleanup.push(() => clearTimeout(idleTimer));

    resetIdle();
  },

  /* Opcional: intercepta o primeiro "voltar" no mobile */
  watchBack() {
    try { history.pushState(null, "", location.href); } catch (e) { return; }

    this.on(window, "popstate", () => {
      if (this.canFire()) {
        try { history.pushState(null, "", location.href); } catch (e) {}
        this.show("back");
      }
    });
  },

  init() {
    if (!EXIT_POPUP_ENABLED || !exitModal) return;
    if (this.isBlocked()) return;

    setTimeout(() => { this.armed = true; }, ARM_DELAY);

    if (window.matchMedia("(pointer: fine)").matches) this.watchPointer();
    else this.watchMobile();

    if (ENABLE_BACK_TRAP) this.watchBack();
  }
};

/* --- Fechar: X, overlay, recusa e ESC --- */
document.querySelectorAll("[data-exit-close]").forEach((el) => {
  el.addEventListener("click", () => {
    ExitPopup.hide(el.hasAttribute("data-exit-decline") ? "recusa" : "x");
  });
});

if (exitModal) {
  exitModal.addEventListener("click", (e) => {
    if (e.target === exitModal) ExitPopup.hide("overlay");
  });
}

document.addEventListener("keydown", (e) => {
  if (!ExitPopup.open) return;

  if (e.key === "Escape") { ExitPopup.hide("esc"); return; }
  if (e.key !== "Tab") return;

  const box = exitModal.querySelector(".modal-box");
  if (!box) return;

  const items = Array.from(box.querySelectorAll(EXIT_FOCUSABLE))
    .filter((n) => !n.disabled && n.offsetParent !== null);
  if (!items.length) return;

  const first = items[0];
  const last = items[items.length - 1];

  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* --- Validação do popup ---
   Segue a convenção deste site: a classe .invalid vai no wrapper .field,
   e a mensagem no <span class="error">. Chaves próprias para não colidir
   com o formulário principal. */
function exitSetError(id, msg) {
  const input = document.getElementById(id);
  const field = input ? input.closest(".field") : null;
  const errorEl = exitForm ? exitForm.querySelector(`[data-error-for="${id}"]`) : null;

  if (field) field.classList.toggle("invalid", !!msg);
  if (errorEl) errorEl.textContent = msg || "";
}

function validateExit() {
  let ok = true;

  const nome  = document.getElementById("exit_name")?.value.trim() || "";
  const email = document.getElementById("exit_email")?.value.trim() || "";
  const tel   = document.getElementById("exit_phone")?.value || "";

  ["exit_name", "exit_email", "exit_phone"].forEach((id) => exitSetError(id, ""));

  if (nome.length < 3) {
    exitSetError("exit_name", "Informe seu nome completo.");
    ok = false;
  }
  if (!isEmail(email)) {
    exitSetError("exit_email", "Informe um e-mail válido.");
    ok = false;
  }
  if (!isPhone(tel)) {
    exitSetError("exit_phone", "Informe um WhatsApp válido com DDD.");
    ok = false;
  }

  return ok;
}

/* --- Envio --- */
function enviarComunidade() {
  if (exitBtn) {
    exitBtn.disabled = true;
    exitBtn.textContent = "ENVIANDO...";
  }

  const nomeEl  = document.getElementById("exit_name");
  const emailEl = document.getElementById("exit_email");
  const phoneEl = document.getElementById("exit_phone");
  const telE164 = "55" + phoneDigitsNacional(phoneEl.value);

  const payload = {
    nome: nomeEl.value.trim(),
    email: emailEl.value.trim(),
    telefone: phoneEl.value.trim(),
    phone_e164: telE164,
    origem: "UNICIVE_COMUNIDADE",
    gatilho: ExitPopup.trigger || "",
    pagina_url: window.location.href,
    utm_source: utm("utm_source"),
    utm_campaign: utm("utm_campaign")
  };

  // Fire-and-forget, de propósito. Com mode:"no-cors" não dá para ler a
  // resposta, então esperar não garante nada — só prenderia o visitante numa
  // tela de "ENVIANDO..." se o Apps Script estivesse lento. O REDIRECT_DELAY_MS
  // abaixo já dá folga suficiente para a requisição sair.
  fetch(COMMUNITY_SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  }).catch((err) => {
    console.error("[ExitPopup] Falha ao salvar na planilha (segue o redirect):", err);
  });

  ExitPopup.submitted = true;
  ExitStore.set(EXIT_KEY_CONVERTED, "1");
  exitSnooze();
  exitTrack("exit_popup_submit", { trigger: ExitPopup.trigger });

  // Sem reset() aqui: ferramentas de tracking leem os campos no blur.
  const successEl = document.getElementById("exit-success");
  if (successEl) {
    exitForm.querySelectorAll(".field, .note").forEach((el) => { el.style.display = "none"; });
    if (exitBtn) exitBtn.style.display = "none";
    successEl.hidden = false;
  }

  const params = new URLSearchParams({
    name: nomeEl.value.trim(),
    email: emailEl.value.trim(),
    phone: telE164
  });

  setTimeout(() => {
    const destino = COMMUNITY_URL || WHATSAPP_REDIRECT;
    window.location.href = `${destino}?${params.toString()}`;
  }, REDIRECT_DELAY_MS);
}

/* --- Barreira do popup: submit capturado no DOCUMENT ---
   stopImmediatePropagation SEMPRE, válido ou não: este cadastro é de
   comunidade e nunca pode virar Lead. Sem a flag `true` de captura o listener
   rodaria depois dos listeners do <form>, e a regra do painel já teria
   disparado — a proteção simplesmente não existiria. */
document.addEventListener(
  "submit",
  (e) => {
    if (!exitForm || e.target !== exitForm) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!validateExit()) return;

    enviarComunidade();
  },
  true
);

/* Teste no console:
     ExitPopup.show()       → abre agora, ignorando as travas
     ExitPopup.hide()       → fecha
     ExitPopup.isBlocked()  → diz se alguma trava está impedindo
   Rearmar: sessionStorage.clear(); localStorage.clear() */
window.ExitPopup = ExitPopup;

ExitPopup.init();
