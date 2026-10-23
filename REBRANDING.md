# Unicive × CPPEM — próximo capítulo

Proposta local de rebranding implementada em 19/10/2026. Abra `index.html` no
navegador, mantendo `styles.css`, `hero-video.css`, `rebrand.js`, `hero-video.js`,
`script.js` e `public/` juntos.
Não foi feito deploy.

## Direção visual

“Seu próximo capítulo começa com um diploma.” A composição aproxima a página
de uma campanha acadêmica: verde profundo, dourado claro, marfim, fotos reais
dos formandos e títulos amplos com destaques em itálico. As marcas existentes
foram mantidas; a Unicive aparece sobre marfim para preservar a leitura do logo.

Referências consultadas no workspace:

- `lp de Eventos/blackFridayUnicive/styles.css`: verde da Unicive, luz e dourado.
- `lp de Eventos/semanazero/styles.css`: profundidade, contraste e foco visível.
- `lp de Eventos/simuladaogeralizado/hero.css` e `hero.js`: movimento em camadas,
  respeito a movimento reduzido e pausa fora da tela.
- `Sites CPPEM/siteColegioCPPEM-Novo/components/home/segments-section.tsx`:
  fotografias, luz e resposta ao passar o mouse.
- `Sites CPPEM/siteColegioCPPEM-Novo/components/shared/photo-marquee.tsx`:
  uso de fotos reais como prova visual. Aqui a galeria tem navegação manual.

## Estrutura e efeitos

1. Cabeçalho com parceria Unicive × CPPEM e acesso ao atendimento.
2. Abertura com vídeo institucional à direita, capa cinematográfica de formatura,
   moldura em perspectiva, anel de play e transição de entrada.
3. Seleção dos oito cursos mais escolhidos em lista compacta, com formulário
   de inscrição visível ao lado no desktop. O texto esclarece que existem
   outras opções e o botão “Conhecer outras opções” leva ao atendimento.
   No celular e tablet, o formulário aparece entre a apresentação e a lista.
4. Explicação dos passos para entrar em contato. O vídeo Panda original foi
   movido para o hero; não há um segundo player abaixo dos cursos.
5. Galeria de formandos com rolagem por toque, teclado ou setas.
6. Consulta oficial ao e-MEC, dúvidas frequentes e chamada final.

Entradas ao rolar, brilho nos botões, aproximação das fotos e barra de progresso
completam a apresentação. O layout tem ajustes para celular, tablet e desktop.
No celular, há um botão fixo de contato. A preferência de movimento reduzido
desativa as animações e o início automático do vídeo.

## Fluxos preservados

A seção de cursos teve o espaçamento reduzido e os cards quadrados foram
substituídos por linhas de aproximadamente 49 px, com ícone, nome e seta.
Os oito cursos e seus destinos foram preservados. A identificação “Os mais
escolhidos” segue a orientação de conteúdo do responsável pela página; não
foi acrescentado ranking numérico. A altura dos campos e botões do formulário
continua adequada ao toque, com margens e preenchimentos mais compactos.

`script.js` foi adaptado para levar os botões até o formulário visível, aplicar
a máscara também no preenchimento direto e evitar o popup de saída durante a
edição. Os IDs, nomes, opções de escolaridade e gatilhos de rastreamento
continuam compatíveis com o formulário original. Foram mantidos
GTM, campos PixelX, UTMs, envio para planilha, WhatsApp, grupos, supletivo e popup
de comunidade. `google-apps-script.js` já tinha alterações antes deste trabalho
e não foi editado no rebranding.

`rebrand.js` cuida da apresentação, da galeria e dos estados acessíveis de erro.
Os campos receberam labels e associação com as mensagens de erro. Há apenas
um formulário principal; o modal de comunidade continua separado. Os botões
de contato rolam até o formulário e colocam o foco no primeiro campo.

## Verificação

JavaScript passou em `node --check`; o CSS foi analisado com PostCSS. As referências
a arquivos locais e âncoras foram verificadas. O diff de `index.html` passou em
`git diff --check`. O diff global contém um espaço no fim de linha já existente
na alteração de `google-apps-script.js`, fora desta entrega.

Na primeira versão, onze verificações em DOM simulado, com jsdom, passaram:

- Estrutura HTML, IDs únicos, arquivos, âncoras e labels.
- Oito cursos e contratos de tracking comparados com o HTML anterior no Git.
- Abertura dos 14 botões de contato, fechamento, Escape e retorno do foco.
- Bloqueio de formulário inválido e mensagens de erro acessíveis.
- Contato principal: payload, UTMs, bloqueio de duplicação e destino WhatsApp.
- Contato de curso: payload, UTMs, bloqueio de duplicação e destino do grupo.
- Sem Ensino Médio: payload, UTMs, bloqueio de duplicação e destino supletivo.
- Comunidade: origem separada e bloqueio de propagação do evento de Lead.
- Tab e Shift+Tab dentro do modal principal.
- Revelação das seções e pausa do detalhe flutuante fora da tela.
- Movimento reduzido, galeria e fallback sem IntersectionObserver.

Após mover o formulário para a seção de cursos, oito cenários simulados passaram:
formulário único e visível; 14 botões levando até ele; máscara no preenchimento
direto e bloqueio do popup durante edição; validação e erros acessíveis; envio
direto para WhatsApp; destino de grupo ao selecionar curso; supletivo sem Ensino
Médio; restauração do destino geral ao clicar em contato. Os cenários de envio
também verificaram UTMs, normalização do telefone e bloqueio de duplicação.
O CSS e a sintaxe JavaScript foram novamente verificados.

## Vídeo no hero

O hero também usa uma arte panorâmica gerada com imagegen em
`public/background-hero-unicive-v1.webp`: arquitetura em esmeralda, luz dourada
na borda direita e área escura à esquerda para o título. O recorte e a camada
de contraste se adaptam ao celular. Original e prompt foram preservados em
`output/imagegen/`. É um cenário conceitual, não uma fotografia do campus.

`hero-video.css` e `hero-video.js` controlam a nova apresentação. A capa foi
gerada com imagegen: capelo e diploma em cenário esmeralda e dourado, com uma
passagem iluminada ao fundo. É uma imagem conceitual, não um frame do filme
nem uma representação do campus. O original e o prompt estão em
`output/imagegen/`; a página utiliza `public/capa-video-institucional-v1.webp`
(1672 × 941). Os textos e o botão de play continuam em HTML. O player mantém
a proporção 16:9, sem recortar o vídeo.

A página mostra a capa primeiro. Depois da primeira rolagem, com ao menos 65%
da área do vídeo visível por 900 ms, tenta iniciar uma prévia sem áudio. O iframe
só carrega após essa condição ou um clique. Movimento reduzido ou economia de
dados desativam a prévia automática; o botão manual continua disponível.

“Assistir com som” reinicia a prévia do começo e solicita volume normal. O vídeo
pausa ao sair da tela, ao ocultar a aba ou ao abrir o popup de comunidade. Uma
pausa não causa retomada automática ao voltar. Há controles de pausa/continuação
e um link para abrir o player separadamente. Se o início não for confirmado, a
capa dá lugar aos controles nativos em vez de informar reprodução bem-sucedida.

Integração baseada nas fontes oficiais:

- [Comandos do player](https://docs.pandavideo.com/reference/send-events).
- [Eventos de reprodução](https://docs.pandavideo.com/reference/receive-events).
- [Parâmetros de reprodução](https://docs.pandavideo.com/reference/query-params).
- [Exemplo de ativação de áudio](https://help.pandavideo.com/en-us/article/how-to-use-a-custom-muted-indicator-1c2oaze/).

As mensagens são enviadas à origem exata do iframe; as recebidas só são aceitas
quando a origem e a janela remetente correspondem ao player esperado.

Treze cenários em DOM simulado passaram para esta revisão: player único no hero
e integridade da página; capa inicial; prévia por rolagem e confirmação de play;
passagem rápida; movimento reduzido; economia de dados; fallback sem observador;
ativação de áudio; pausa fora da tela e retomada manual; aba oculta e popup;
rejeição de mensagens de outras origens/janelas; fallback de autoplay bloqueado;
erro e fim do vídeo. Comandos e eventos foram simulados: a reprodução e o áudio
reais, as regras do navegador e a aparência final continuam sem validação visual.

Os testes interceptaram as requisições e capturaram os destinos: nenhum lead
real foi enviado. Não validam PixelX/GTM ao vivo, gravação em planilha, reprodução
do vídeo ou destinos externos. Sem navegador conectado nesta sessão, a revisão
visual em desktop e celular permanece pendente. Também não houve auditoria de
reconhecimento dos cursos; o link oficial e o atendimento permitem consultar
essas informações.
