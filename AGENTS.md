# Regras permanentes de desenvolvimento — Oficina 3D Professional

Antes de alterar código, consultar `README.md` e `docs/ESPECIFICACAO.md`.

## Contrato de trabalho
- Trabalhar por iterações mínimas, preservando o que funciona e validando cada alteração.
- Manter a aplicação genuinamente tridimensional (Three.js / WebGL), com geometria independente.
- Não substituir a cena 3D por uma imagem, vídeo ou falsa simulação interativa.
- Usar português de Portugal na interface.
- Tratar todas as dimensões como **estimativas**, até serem substituídas por levantamento real.
- Centralizar o layout em `src/config.js`, evitando coordenadas espalhadas por todos os ficheiros.
- Preservar a entrada lateral esquerda e a saída frontal direita, livre e larga.
- Não regressar à antiga zona 'ELEVADOR' junto do alinhamento.
- Não regressar às três caixas de estacionamento junto à saída.
- Não alterar o equipamento vermelho central de dois postes por confusão com o 'ELEVADOR' removido.
- Não afirmar que setas ou trajetórias ilustrativas comprovam segurança/manobras reais.
- Registar comandos de execução, alterações e limitações.
- Evitar comprometer a privacidade; não incluir dados de clientes, fotografias de pessoas ou moradas pessoais.
- Evitar refatorações de larga escala sem pedido explícito.

## Estrutura atual
`index.html` — interface e importmap; `styles.css` — estilos; `src/config.js` — zonas e vistas; `src/scene.js` — geometria; `src/main.js` — render, controlos e interface.

## Definição de concluído
- Cena 3D abre num browser com WebGL e acesso ao CDN.
- Orbit/pan/zoom, visita guiada, vista de planta, caminhada e inspeção funcionam.
- Entrada/saída e layout conforme referência conceptual.
- Sem erros de sintaxe, imports ou carregamento.
- UI utilizável em desktop e ecrãs menores.
