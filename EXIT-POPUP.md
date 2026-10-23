# Exit Popup (Exit Intent) — UniCV Caruaru

Popup de intenção de saída instalado nesta landing. Mesmo padrão das outras
capturas da CPPEM. No rebranding de 19/10/2026, a apresentação passou a usar
verde profundo e dourado, com formulário em fundo marfim e tipografia Manrope
e DM Sans. O formulário principal agora fica visível junto aos cursos; o popup
de saída não interrompe o visitante enquanto ele está preenchendo seus dados.
Os contratos de tracking e a separação da comunidade foram preservados.

---

## 1. O que faz

Recupera o visitante que está saindo sem preencher o formulário, oferecendo uma
**segunda porta de menor atrito**: a comunidade gratuita.

```text
[selo]      ESPERA UM POUCO
[título]    NÃO DESISTA DO SEU SONHO DE TER UM DIPLOMA!
[sub]       Inscreva-se abaixo para receber:
[benefício] ✓ Comunidade com novidades diárias, materiais gratuitos,
              dicas e descontos!
[form]      Nome completo · E-mail · WhatsApp
[cta]       QUERO ENTRAR NA COMUNIDADE
[recusa]    Não, quero continuar sem ajuda
```

> A copy foi adaptada ao contexto desta landing: aqui é faculdade EAD, não
> concurso. O título fala de **diploma**, e a lista de benefícios trocou
> "questões" por "dicas". Se preferir o texto padrão das outras landings, é uma
> linha no [index.html](index.html).

---

## 2. Destino do cadastro

```js
const COMMUNITY_URL = "https://pxa.cppem.com.br/lt/grupos-unicive";
```

Link rastreado no domínio próprio da PixelX, **específico do UniCV** — não
confundir com o `cppem-contato-grupos`, que é das landings de concurso.

> ⚠️ **Confira no painel se esse link `/lt/` está marcado como conversão.** Se
> estiver, o clique registra conversão e desfaz a separação que a barreira de
> submit garante — ver [§3](#3-️-tracking--o-ponto-mais-importante).

O armazenamento já está resolvido:

```js
const COMMUNITY_SHEET_URL = SHEET_URL.replace(/\?aba=.*$/, "?aba=UNICIVE_COMUNIDADE");
```

Mesma implantação do Apps Script do formulário principal, em **aba separada**.

> **Exige nova implantação.** O [google-apps-script.js](google-apps-script.js)
> usava `getActiveSheet()` e ignorava o `?aba=` — tudo cairia na mesma aba.
> Foi corrigido para rotear pela aba (criando-a se não existir). Cole o arquivo
> atualizado no Apps Script e faça **Implantar → Nova implantação**, não
> "gerenciar existente".

---

## 3. ⚠️ Tracking — o ponto mais importante

Leia o [TRACKING.md](TRACKING.md) antes de mexer aqui.

Este site roda **Modelo A**: a PixelX dispara o `Lead` no submit do formulário
principal, por uma regra do painel. Isso cria um risco direto:

> Se o submit do popup propagar, a regra do painel conta o cadastro na
> comunidade como **lead de venda**.

Quem entra numa comunidade gratuita tem intenção muito menor que quem pede
contato comercial. Misturar os dois **degrada a otimização das campanhas**.

### Como está resolvido

```js
document.addEventListener("submit", (e) => {
  if (!exitForm || e.target !== exitForm) return;
  e.preventDefault();
  e.stopImmediatePropagation();   // <- nenhuma regra externa alcança este form
  if (!validateExit()) return;
  enviarComunidade();
}, true);                          // <- FASE DE CAPTURA
```

**A flag `true` é o ponto inteiro.** Um listener de captura no `document` roda
sempre antes de qualquer listener registrado no `<form>` — inclusive os que a
PixelX instala de dentro de um `start()` assíncrono. Sem ela, o listener rodaria
depois e a regra do painel já teria disparado.

> A barreira que já existia para o formulário principal não foi tocada. Um teste
> confirma que ele **continua propagando** normalmente para o painel.

### Eventos que o popup emite

| Evento `dataLayer` | Quando | Parâmetros |
|---|---|---|
| `exit_popup_view` | popup apareceu | `trigger` |
| `exit_popup_submit` | envio com sucesso | `trigger` |
| `exit_popup_close` | fechou sem enviar | `trigger`, `method` |

Se criar tag no GTM para o cadastro da comunidade, use `exit_popup_submit`.
**Nunca** aponte a tag de `Lead` para ele.

---

## 4. Convivência com o modal que já existia

Esta landing já tinha um modal (`#form-modal`, aberto pelo `#open-form-btn`).
O popup de saída:

- **reaproveita** `.modal-overlay`, `.modal-box`, `.modal-close` e o card `.form`
- usa o mesmo `body.modal-open` para travar o scroll
- **nunca abre por cima** do modal principal — `isBlocked()` retorna `true`
  enquanto `#form-modal` estiver aberto
- usa chaves próprias no `data-error-for` (`exit_name`, `exit_email`,
  `exit_phone`), senão o `querySelector` do formulário principal encontraria os
  elementos errados

A validação segue a convenção deste site: a classe `.invalid` vai no **wrapper
`.field`**, não no input.

---

## 5. Os gatilhos

Plataforma detectada por `matchMedia('(pointer: fine)')` — nunca por user-agent.

| Plataforma | Gatilho | Condição |
|---|---|---|
| Desktop | Cursor sai pelo topo | `mouseout` sem `relatedTarget` e `clientY <= 0` |
| Mobile | Inatividade | 25s sem scroll, toque ou clique |
| Mobile | *Push* bruto ao topo | regra abaixo |
| Mobile | Botão voltar | só com `ENABLE_BACK_TRAP = true` |

Todos exigem 8s de permanência mínima na página.

### O *push* bruto ao topo

Subir rápido não basta — isso dispararia em rolagem comum. O gatilho exige o
**gesto inteiro** e só dispara quando **todas** as condições valem juntas:

| Condição | Valor | Por quê |
|---|---|---|
| Distância acumulada | ≥ `1200px` ou 2 telas cheias | Descarta subidas curtas |
| Velocidade média | ≥ `1.2 px/ms` | Separa arremesso de rolagem deliberada |
| Posição final | ≤ `200px` do topo | "Foi até o início de uma vez" |
| Eventos no burst | ≥ 2 | Sem 2 eventos não há intervalo para medir velocidade |

O burst zera se o usuário descer mais de `60px` ou passar `400ms` sem evento.
Descidas menores são toleradas: um *layout shift* de imagem carregando não pode
matar o gesto.

A exigência de 2 eventos existe porque, quando o browser entrega o gesto
coalescido num único evento, a duração é ~0 e a velocidade tenderia ao infinito —
fazendo rolagem lenta passar por arremesso. **A regra erra deliberadamente para o
lado de não aparecer.**

---

## 6. Design

Nenhuma variável de cor nova. O card, os campos e o botão são os mesmos do
formulário principal.

| Elemento | Vem de |
|---|---|
| Overlay e caixa | `.modal-overlay`, `.modal-box`, `.modal-close` |
| Card branco | `.form` |
| Inputs e erros | `.field`, `.field .error`, `.field.invalid` |
| Botão | `.cta` — mesmo gradiente dourado |
| Nota / sucesso | `.note`, `.success` |

Único detalhe novo que merece explicação: o destaque do título usa **marca-texto
dourado**, não texto dourado:

```css
.exit__title span{
  background:linear-gradient(180deg,transparent 62%,rgba(243,193,79,.75) 62%);
}
```

Dourado `#e3a11b` sobre branco tem contraste de ~2,2:1 — abaixo do mínimo
legível. O marca-texto mantém o brilho da marca com o texto em verde escuro,
que lê bem.

Validado em **1280px e 390px**.

---

## 7. Configuração

Tudo no topo do bloco novo em [script.js](script.js):

```js
const EXIT_POPUP_ENABLED = true;    // kill switch — false desliga tudo
const ENABLE_BACK_TRAP   = false;   // "voltar" no mobile (eficaz e invasivo)
const ARM_DELAY          = 8000;    // ms mínimos na página
const IDLE_DELAY         = 25000;   // ms de inatividade (mobile)
const SNOOZE_DAYS        = 3;       // silêncio após fechar/enviar
const STORAGE_PREFIX     = "cppem_unicive";
```

| Quero... | Faço |
|---|---|
| Desligar o popup | `EXIT_POPUP_ENABLED = false` |
| Gatilho de scroll mais difícil | aumentar `SCROLL_UP_MIN_PX` ou `SCROLL_UP_SPEED` |
| Desligar só o gatilho de scroll | `SCROLL_UP_MIN_PX = 999999` |
| Testar sem esperar | console: `ExitPopup.show()` |
| Descobrir por que não abre | console: `ExitPopup.isBlocked()` |

---

## 8. ⚠️ "O popup parou de abrir" — leia antes de suspeitar do código

**Este é o erro mais fácil de cometer.** Depois de testar o site algumas vezes o
popup para de aparecer e parece quebrado. Na quase totalidade dos casos ele está
funcionando — o bloqueio está no **seu navegador**.

| Chave | Onde | Duração | Grava quando |
|---|---|---|---|
| `cppem_unicive_exit_seen` | sessionStorage | a sessão | o popup aparece |
| `cppem_unicive_exit_snooze` | localStorage | **3 dias** | você fecha OU envia |
| `cppem_unicive_lead_converted` | localStorage | **para sempre** | você se cadastra na comunidade |

### Diagnóstico em 5 segundos

```js
ExitPopup.isBlocked()                                  // true = travado, código OK
localStorage.getItem("cppem_unicive_lead_converted")   // "1" = é este o motivo
localStorage.getItem("cppem_unicive_exit_snooze")      // timestamp futuro = snooze
```

### Destravar

```js
sessionStorage.clear(); localStorage.clear(); location.reload();
```

Depois **aguarde 8 segundos** antes de tentar sair — abaixo do `ARM_DELAY` o
gatilho nem está armado. Para abrir na hora: `ExitPopup.show()`.

### Antes de concluir que o deploy falhou

```bash
curl -s https://SEU-DOMINIO/script.js | grep -c "EXIT_POPUP_ENABLED"   # > 0
curl -sL https://SEU-DOMINIO/ | grep -c 'id="exit-modal"'              # 1
```

### Ordem de investigação

1. `ExitPopup.isBlocked()` → `true`? É storage. Limpe e recarregue.
2. Esperou os 8 segundos?
3. O modal principal está aberto? O popup não abre por cima dele.
4. O `curl` confirma o código no ar?
5. Erro de JS no console antes do fim do `script.js`? Um erro no topo impede o
   `init()` de rodar.

---

## 9. Testes

**23 casos** em Chrome real, com um espião registrado no `<form>` simulando a
regra de submit do painel:

- popup começa oculto e não bloqueado em sessão limpa
- **bloqueado enquanto o modal principal está aberto**, desbloqueia ao fechar
- abre, trava o scroll via `body.modal-open`, emite `exit_popup_view`
- validação dos 3 campos; `.invalid` aplicado no wrapper `.field`
- **erro do popup não vaza para o formulário principal**
- envio emite `exit_popup_submit`, marca convertido e redireciona
- **a regra do painel não alcança o popup** ← o teste que importa
- fecha, destrava o scroll, não emite `close` depois de enviar
- **o formulário principal continua propagando para o painel**

---

## 10. Uma nota sobre o envio à planilha

O `fetch` para o Apps Script é **fire-and-forget**, de propósito:

```js
fetch(COMMUNITY_SHEET_URL, {...}).catch(...)   // sem await
```

Com `mode:"no-cors"` não dá para ler a resposta, então aguardar não traz garantia
nenhuma — só prenderia o visitante numa tela de "ENVIANDO..." se o Apps Script
estivesse lento. O `REDIRECT_DELAY_MS` de 1500ms já dá folga para a requisição
sair antes da navegação.

---

## 11. Limitações honestas

- **Exit intent de verdade não existe no mobile.** Inatividade e *push* ao topo
  são aproximações de comportamento. Parte do tráfego mobile sai sem ver o popup.
- **Canibalização é possível.** Meça com os eventos de `dataLayer` — o que
  importa é se o formulário principal **caiu** no mesmo período.
- **A PixelX captura campos no `blur`, independente de submit.** Os campos do
  popup usam `name="name|email|phone"`, então dados parciais chegam ao painel
  como captura de lead. Isso **não** é evento de `Lead`.
- **Uma regra de conversão por clique no painel duplicaria**, e nenhum código de
  site consegue impedir: o clique acontece antes do submit.
