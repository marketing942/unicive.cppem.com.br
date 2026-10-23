# Rastreamento de formulários — GTM + PixelX

Documentação do que foi corrigido no formulário de captura do CPPEM, escrita para
ser **reaproveitada em outros sites** com a mesma stack.

Todo o comportamento da PixelX descrito aqui foi verificado lendo o código-fonte
do `PixelXApp` e do `PxaMask` servidos pelo painel — não é suposição.

---

## 1. A arquitetura

Três camadas independentes que se sobrepõem no mesmo formulário:

| Camada | Onde vive | O que faz |
|---|---|---|
| **GTM server-side** | `<head>`, loader first-party | Container sGTM próprio. No CPPEM: `https://sgtm.cppem.com.br/metrics/` |
| **PixelX** | `window.pixel_x_app`, carregado pelo GTM | Captura dados do lead, aplica máscara, dispara eventos de conversão |
| **`script.js` do site** | Bottom do `<body>` | Validação, mensagem de sucesso, redirecionamento |

O ponto central de todo o trabalho: **a PixelX se engancha no evento `submit`
nativo do formulário.** Qualquer coisa que impeça esse evento de existir, ou que
o deixe passar cedo demais, quebra o rastreamento — silenciosamente.

### Loader do GTM

```html
<script>(function(w,d,s,l){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'?l='+l:'';j.async=true;j.src=
'https://sgtm.cppem.com.br/metrics/'+dl;f.parentNode.insertBefore(j,f);})
(window,document,'script','dataLayer');</script>
```

Note que **não há parâmetro `id=GTM-XXXX`** — o ID do container está embutido no
path do loader server-side (`/metrics/`). Ao replicar em outro site, troque o
domínio e o path pelos do container daquele cliente.

---

## 2. Como a PixelX identifica os campos

Isto define os atributos que o HTML **precisa** ter. De `input_has_type()`:

```js
const keywords = {
    phone: ['tel', 'phone', 'ph', 'cel', 'mobile', 'fone', 'whats'],
    mail:  ['mail', 'email', 'em'],
    name:  ['nome', 'nombre', 'name', 'nm'],
    doc:   ['document', 'doc', 'cpf', 'cnpj'],
};
```

Ela testa se o atributo **contém** (não "é igual a") alguma dessas palavras.

**Armadilha importante — a fonte do nome muda conforme a função:**

| Função | O que ela lê |
|---|---|
| `monitor_forms()` | `field.name \|\| field.id` — o `id` serve de reserva |
| `mask()` (máscara de telefone) | **apenas `el.name`** — sem reserva |

Ou seja: um campo só com `id="lead_phone"` e sem `name` é monitorado, mas **não
recebe a máscara**. Sempre defina os dois.

### HTML de referência

```html
<form name="lead_form" id="ID_DO_FORM_NO_PAINEL" novalidate>
  <input type="text"  id="lead_name"  name="name"                        required />
  <input type="email" id="lead_email" name="email"                       required />
  <input type="text"  id="lead_phone" name="phone" class="pxa_mask_phone" required />
  <button type="submit" id="lead_submit" class="cta">ENVIAR</button>
</form>
```

Regras que valem para qualquer site:

- O `id` do `<form>` é o identificador usado no painel da PixelX. **Ele tem que
  ser único na página.**
- O botão precisa de `id` próprio e `type="submit"`.
- A classe `pxa_mask_phone` (ou `pxa-mask-phone`, ou os mesmos como `id`) marca
  qual campo recebe a máscara. **O formato em si vem do painel**, não do HTML —
  `mask_load()` sai logo no início se `data.phone_mask` não estiver configurado.

---

## 3. Os defeitos encontrados e as correções

### 3.1 `id` duplicado entre o `<form>` e o `<button>`

```html
<!-- ERRADO -->
<form id="IPEyzyfmJhKQEYIXAlZH">
  <button type="submit" id="IPEyzyfmJhKQEYIXAlZH">Enviar</button>
</form>
```

`document.getElementById()` retorna o **primeiro** match, que é o `<form>`. Então
`submitBtn` apontava para o formulário, e esta linha apagava a página inteira do
formulário ao clicar:

```js
submitBtn.textContent = "ENVIANDO..."; // destruía todos os filhos do <form>
```

**Correção:** `id` único no form, `id` próprio no botão.

### 3.2 `name` do campo divergente do `data-error-for`

O e-mail tinha `name="mail"` e `data-error-for="mail"`, mas o JS chamava
`setError("email", ...)`. As mensagens de erro de e-mail simplesmente nunca
apareciam. **Correção:** padronizar tudo em `email`.

### 3.3 `name="submit"` no botão quebra `form.submit()`

`HTMLFormElement` é declarado com `[LegacyOverrideBuiltIns]` na spec: um controle
chamado `submit` **sobrescreve o método** `form.submit()`, que deixa de ser
função. Se a PixelX (ou qualquer script) chamar `form.submit()`, estoura.

**Correção:** nunca usar `name="submit"`, `name="reset"` ou `name="action"` em
controles de formulário.

### 3.4 `preventDefault()` no clique mata o evento `submit`

```js
// ERRADO — a PixelX nunca vê o submit
submitBtn.addEventListener("click", (e) => {
  e.preventDefault();
  enviar();
});
```

Cancelar a ação padrão do clique faz o navegador **não gerar** o evento `submit`.
A PixelX escuta exatamente esse evento, então o Lead nunca era registrado.

**Correção:** escutar o `submit` do formulário e dar `preventDefault()` **lá** — o
evento já foi disparado (a PixelX recebeu) e só a navegação é bloqueada. De
quebra, o Enter passa a funcionar de graça, via submissão implícita.

### 3.5 Evento `Lead` duplicado

Adicionamos manualmente:

```js
await window.pixel_x_app.send_event({ event_name: 'Lead', ... });
```

enquanto o painel já disparava o Lead no submit. Resultado: dois eventos por
conversão.

**Fato que esclarece a confusão:** `monitor_forms()` **não dispara evento de
conversão nenhum.** Ela só percorre os inputs, identifica o tipo e chama
`input_monitor()`, que adiciona um listener de `blur` → `input_save()` →
`debounce_send_lead_data()`. Isso é **captura de dados do lead**, não Lead.

Quem dispara o Lead no submit é a regra de evento configurada no painel
(mecanismo do `monitor_forms_dynamic`, listener de `submit` com debounce de
1500 ms).

**Regra geral:** se o Lead já está configurado no painel, **não chame
`send_event('Lead')` no site.** Escolha um dos dois, nunca os dois.

### 3.6 `form.reset()` e redirecionamento cedo demais

O handler da PixelX roda no submit, mas a requisição é assíncrona (e com debounce
de 1500 ms). Duas coisas atropelavam isso:

- `form.reset()` logo após o submit → risco de a PixelX ler campos já vazios.
  **Correção:** removido. O usuário sai da página em seguida mesmo.
- `setTimeout(redirect, 700)` → em conexão móvel lenta, a navegação cancelava a
  requisição do evento. **Correção:** 1500 ms, alinhado ao debounce da PixelX.

```js
const REDIRECT_DELAY_MS = 1500; // abaixo de ~1s começa a perder eventos
```

### 3.7 Validar o telefone pelo `length` da string — o erro mais traiçoeiro

Tentativas que **falharam**, e por quê:

| Regra | Por que quebra |
|---|---|
| `tel.length < 1` | aceita qualquer coisa |
| `tel.length < 13` | `(81) 97310-5354` mascarado tem 15 chars, mas `81973105354` cru tem 11 e seria **rejeitado**; e `(81) 97310-53`, incompleto, tem 13 e **passava** |
| `digitos.length === 11` | **o `+55` da máscara conta como 2 dígitos** |

O último merece atenção porque é o que enganou de verdade. O padrão da máscara é
`+{55} (00) [9]0000-0000`, onde `{55}` é **texto fixo**: aparece na tela desde o
primeiro caractere digitado, mas não é número que o visitante informou. Então:

```
+55 (81) 9996-741  →  55 81 9996 741  →  11 dígitos  →  passava!
```

Um número completo tem 13 dígitos com o país. Exigir 11 estava, na prática,
pedindo apenas 7 dígitos do usuário.

**Correção:** remover o prefixo do país pelo `+` literal antes de contar. Tanto a
máscara quanto o `phone_valid()` da PixelX sempre escrevem esse `+`, o que faz
dele um marcador confiável — diferente de remover pelos dígitos, que seria
ambíguo, já que **o DDD 55 existe** (Santa Maria/RS).

```js
const isPhone = (v) => {
  const nacional = v.trim().replace(/^\+\s*55\s*/, "");
  const d = nacional.replace(/\D/g, "");

  return d.length === 11 && d[2] === "9";
};
```

| Entrada | Nacional | Dígitos | Resultado |
|---|---|---|---|
| `+55 (81) 9996-741` | `(81) 9996-741` | 9 | rejeita |
| `+55 (81) 99967-412` | `(81) 99967-412` | 10 | rejeita |
| `+55 (81) 99967-4123` | `(81) 99967-4123` | 11 | aceita |
| `81999674123` (sem máscara) | — | 11 | aceita |
| `+5581999674123` (`phone_valid`) | `81999674123` | 11 | aceita |
| `(55) 99999-9999` (DDD 55) | — | 11 | aceita |

### 3.8 Ordem de registro dos listeners de `submit`

A PixelX registra o listener dela **de dentro do `start()`, que é `async`**. Um
listener registrado no próprio `<form>` dispara por ordem de registro, então não
havia garantia de que o nosso viesse antes do dela — se o dela rodasse primeiro,
gravava o Lead antes de descobrirmos que o formulário era inválido.

**Correção:** capturar o `submit` no `document`, em **fase de captura**. Um
listener de captura no `document` roda **sempre** antes de qualquer listener
registrado no elemento-alvo, independente de quem registrou primeiro.

```js
document.addEventListener("submit", (e) => {
  if (e.target !== form) return;

  e.preventDefault();               // nunca recarregar a página

  if (!validate()) {
    e.stopImmediatePropagation();   // o evento morre aqui; PixelX não vê
    return;
  }

  enviar();                         // válido → propaga → PixelX registra o Lead
}, true);
```

`stopImmediatePropagation()` (e não `stopPropagation()`) é o correto: precisamos
impedir também os listeners registrados no `<form>`, que é um nó adiante no
caminho de propagação.

---

## 4. O que **não** dá para controlar pelo site

A PixelX grava dados do lead no **`blur` de cada campo**, sem nenhuma relação com
submit:

```js
async input_monitor(field) {
    field.addEventListener('blur', async event => {
        await this.input_save(event.target.name, event.target.value, field);
        this.debounce_send_lead_data()
    })
}
```

Consequência: **dados parciais chegam ao painel mesmo sem envio nenhum.** Nenhuma
validação no site impede isso. O que as correções garantem é que o **evento de
conversão** só dispare com os dados completos.

Dois comportamentos do vendor que vale conhecer ao depurar:

- `monitor_forms()` roda em `setInterval(..., 5000)` e chama `input_monitor()` de
  novo a cada volta, **sem guarda contra listener duplicado** (diferente do
  `monitor_forms_dynamic`, que usa a classe `pxa_tracked`). Os listeners de
  `blur` se acumulam enquanto a página estiver aberta.
- `power_ups.form_auto_fill` preenche campos **vazios** a cada 5 s com dados de
  leads anteriores guardados em cookie/localStorage. Ao testar, isso pode fazer
  um campo "se preencher sozinho". Use uma aba anônima.

E o `phone_valid()` reescreve o campo no blur quando `power_ups.phone_update`
está ligado, **promovendo 10 dígitos para 11** ao inserir o nono dígito:

```js
if (phone.length === 10) { phone = `55${phone.substring(0,2)}9${phone.substring(2)}` }
```

Por isso a validação do site precisa aguentar receber o campo em qualquer um dos
três formatos: mascarado, cru ou já normalizado com `+55`.

---

## 5. Checklist para replicar em outro site

**HTML**

- [ ] `id` do `<form>` único na página e igual ao configurado no painel
- [ ] Botão com `id` próprio, `type="submit"`, e **sem** `name="submit"`
- [ ] Todo campo com `id` **e** `name` correspondentes (`name` é obrigatório para a máscara)
- [ ] `name` casando com as keywords: `name`, `email`, `phone`
- [ ] Classe `pxa_mask_phone` no campo de telefone
- [ ] `novalidate` no form (a validação é nossa)

**JavaScript**

- [ ] Listener de `submit` no `document` em fase de captura — nunca `click` com `preventDefault`
- [ ] `stopImmediatePropagation()` quando inválido
- [ ] Validação de telefone por **dígitos**, removendo o `+55` antes de contar
- [ ] Sem `form.reset()` antes do redirecionamento
- [ ] Atraso de redirecionamento ≥ 1500 ms
- [ ] **Nenhum** `send_event('Lead')` manual se o painel já dispara o Lead

**Painel da PixelX**

- [ ] `phone_mask` configurado (senão a máscara nem carrega)
- [ ] Conferir se existe regra de Lead no submit — para não duplicar com o site

---

## 6. Como diagnosticar

| Sintoma | Causa provável |
|---|---|
| Página recarrega / URL ganha `?name=...` | `script.js` não executou — erro de JS antes do listener, ou cache |
| Sucesso e redirect com campo inválido | `validate()` retornando `true` — quase sempre a contagem do `+55` |
| Lead duplicado | `send_event()` manual **e** regra no painel ativos ao mesmo tempo |
| Lead nunca chega | `preventDefault()` no clique matando o evento `submit` |
| Máscara não aplica | `name` ausente no input, ou `phone_mask` não configurado no painel |
| Campo se preenche sozinho | `power_ups.form_auto_fill` — teste em aba anônima |

Para inspecionar o estado da PixelX no console:

```js
window.pixel_x_app.data            // config vinda do painel, incl. power_ups e phone_mask
window.pixel_x_app.data.lead_phone // o que ela capturou do campo
document.getElementById("lead_phone")._pxaMask // instância da máscara, se aplicada
```

---

## 7. Arquivos deste projeto

- [index.html](index.html) — form nas linhas 43–63, loader do GTM nas linhas 5–11
- [script.js](script.js) — validação e barreiras de submit
