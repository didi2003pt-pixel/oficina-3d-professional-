# Oficina 3D Professional

**Primeiro visualizador 3D conceptual implementado.** Uma aplicação web de Three.js com navegação em tempo real, exploração de uma oficina de pneus e veículos pesados e visita guiada em português de Portugal.

> **Projeto conceptual:** todos os equipamentos, dimensões e trajetos de circulação estão aproximados. Não constitui uma validação de engenharia, acessibilidade, segurança ou manobras reais.

## Abrir a demonstração

Depois de ativar **Settings → Pages → Build and deployment → Source: GitHub Actions**, o workflow publica automaticamente a aplicação em:

**https://didi2003pt-pixel.github.io/oficina-3d-professional-/**

Se aparecer erro 404, o GitHub Pages ainda não está ativo ou a publicação ainda não foi concluída. Consultar o separador **Actions** para os resultados do workflow `Publicar visualizador 3D`.

## Executar no computador (Windows)

Requisitos: Node.js 20 ou superior e ligação à Internet (a biblioteca Three.js é carregada por CDN).

```powershell
git clone https://github.com/didi2003pt-pixel/oficina-3d-professional-.git
cd oficina-3d-professional-
npm run dev
```

Abrir **http://localhost:4173/** no Chrome ou Edge.

Alternativa, com Python instalado: `py -m http.server 8000` e abrir **http://localhost:8000/**.

Não é necessário `npm install`, porque o servidor de desenvolvimento e os testes usam apenas módulos nativos do Node.js.

## Funcionalidades implementadas

- **Modelo 3D real em WebGL** com paredes, portões abertos, cobertura semi-transparente, iluminação e sinalização.
- **Máquinas e equipamentos conceptuais independentes**: pneus pesados, montagem/equilibragem, alinhamento, camião de caixa, equipamento vermelho de dois postes, rack industrial de pneus e bloco de escritórios.
- **Pneus e armazém (V0.4)**: pneus procedurais com flancos arredondados e dois desenhos de piso. O rack vermelho mantém a implantação original e tem 38 pneus apoiados em dois níveis. O rack usa instâncias e simplifica o piso à distância para reduzir o custo de renderização.
- **Máquinas industriais (V0.5)** com desmontadora de pesados de mandril e braço hidráulico, desmontadora ligeira com prato e garras, equilibradora com eixo, proteção e visor, e estação de alinhamento com rampas, pistas antiderrapantes, sensores e consola. As proporções são provisórias. [Comparação visual da V0.4 e V0.5](docs/comparacao-v04-v05.jpg)
- **Camião de caixa (V0.6)** com cabine moldada, portas e fechos traseiros, chassis e jantes ventiladas. Os oito pneus usam a geometria da V0.4. A cota dos centros subiu 15 mm para assentar os pneus no pavimento e o piso da caixa ganhou folga sobre as rodas traseiras. A iluminação foi equilibrada com as três fontes existentes. [Comparação visual da V0.5 e V0.6](docs/comparacao-v05-v06.jpg)
- **Veículos e circulação (V0.6)**. A oficina abre vazia. Escolhe Camião, Jipe, Carro ligeiro ou Trator para o colocar junto à entrada. Podes iniciar, pausar, continuar e reiniciar o percurso. A opção «Sem veículo» retira o modelo e liberta a passagem.
- **Demonstração da V0.6** em Chromium com WebGL. [Capturas da seleção e do percurso](docs/veiculos-v06.jpg) · [Vídeo](docs/veiculos-v06.mp4)
- **Visita guiada de 11 etapas** com câmaras animadas.
- **Navegação livre**: a visão geral enquadra a oficina conforme o tamanho do visualizador. Podes rodar, aproximar, afastar e deslocar a câmara. «Repor vista» regressa à visão geral.
- **Caminhar na oficina**: WASD/setas para andar, Shift para acelerar, clique no visualizador para controlar o olhar com o rato e Esc para o libertar. A caminhada começa no corredor da entrada e fica delimitada ao interior da nave, do lado da oficina.
- **Planta superior** em projeção ortográfica.
- **Selecionar objetos** para abrir informação sobre cada zona.
- **Alternar visibilidade** da cobertura, da circulação e das etiquetas.
- **Layout aprovado**: entrada na parede esquerda, saída frontal direita ampla, ausência das três caixas no pavimento de saída, alinhamento sem a antiga zona adicional «ELEVADOR».

## Testes

```bash
npm test
```

Inclui verificações de sintaxe, do layout e da interface, e testes de regressão à seleção, aos controlos do percurso e às colisões durante a caminhada. A revisão visual usa Chromium com WebGL.

## Estrutura

```text
index.html                  Interface
styles.css                  Estilo visual responsivo
src/config.js               Zonas, medidas conceptuais e visita
src/scene.js                Geometria e implantação do edifício e equipamentos
src/machine-*.js            Modelos industriais e acabamentos reutilizáveis
src/truck*.js               Cabine, caixa, chassis, rodas e materiais do camião
src/vehicles.js             Catálogo e modelos de veículos
src/vehicle-*.js            Seleção, reprodução, trajetória e verificação de folgas
src/tires.js                Perfis e pisos procedurais reutilizáveis
src/main.js                 Renderização, câmaras, interação, visita
tools/serve.mjs             Servidor local sem dependências
tools/check.mjs             Testes estáticos
tools/check-vehicles.mjs    Testes de regressão do controlador
.github/workflows/pages.yml CI e publicação GitHub Pages
docs/ESPECIFICACAO.md       Regras visuais e funcionais
docs/PLANO.md               Fases de evolução
AGENTS.md                   Regras para alterações futuras
```

## Referências e limitações

A disposição foi interpretada a partir da última imagem aprovada na conversa do projeto. Ainda será necessário adicionar a imagem de referência ao repositório e afinar o modelo após a primeira comparação visual.

A geometria está centralizada em **metros ilustrativos** em `src/config.js`. A circulação amarela expressa o fluxo pretendido, **não um trajeto de manobra validado**. Para a próxima fase, confirmar dimensões reais, espaços operacionais e raios de viragem.

O percurso da V0.6 prolonga a reta de preparação e alarga a curva em direção à saída para acomodar o camião de caixa. A linha amarela e a animação usam a mesma curva. A direção frontal dos modelos é +Z no referencial local. À entrada, a tangente orienta-os para +X. A verificação usa um envelope orientado do veículo ao longo do traçado e desativa o início quando deteta uma interseção.

A biblioteca Three.js é importada da CDN em versão fixa. Para uso offline completo, uma fase posterior poderá integrar as dependências localmente.
