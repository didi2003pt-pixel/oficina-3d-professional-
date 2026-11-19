# Especificação — Oficina 3D Professional

## Estado e contexto
Primeira implementação interativa conceptual baseada nas imagens aprovadas pelo utilizador. Sem dimensões reais. A imagem visual é referência de *organização*, não substitui CAD, plantas nem levantamento técnico.

## Layout obrigatório
- **Entrada** na parede lateral esquerda, não no antigo canto da frente.
- **Saída** na fachada frontal direita, área ampla e sem três marcações de estacionamento.
- **Pneus pesados / montagem e equilibragem / alinhamento** distribuídos na parede do fundo.
- Remover a antiga zona 'ELEVADOR' à direita do alinhamento, mantendo a circulação.
- Manter o **equipamento vermelho de dois postes na área central**.
- **Camião** ao centro e **rack vermelho com pneus** na frente esquerda.
- **Balneários, receção/espera, sala de reuniões e escritório** no bloco envidraçado do lado direito.
- **Percurso amarelo indicativo:** entrada esquerda → corredor técnico → curva à direita → saída frontal direita.

## Experiência
- Renderização WebGL real (Three.js), objetos 3D independentes.
- Órbita/pan/zoom e câmara animada por visita guiada.
- Caminhada ao nível do solo com WASD/setas e movimento do rato.
- Vista de planta ortográfica.
- Mostrar/ocultar cobertura, percurso, etiquetas e camião.
- Cliques nos equipamentos mostram cartão informativo.
- Interface dark premium, responsiva e em português de Portugal.

## Restrições
- Escala e distâncias são ilustrativas.
- Não simular segurança real nem raio de viragem de camiões.
- Dependência CDN de Three.js; é necessária ligação à Internet para carregar a biblioteca na versão publicada.
- Materiais e equipamentos procedimentais com detalhe aproximado, não réplicas certificadas.

## Evoluções
- Importação de assets glTF/GLB reais.
- Medições e levantamento técnico.
- Editor de layout com posições persistentes.
- Teste de trajetórias com dimensões reais, envelopes e folgas.
- Exportação GLB/PNG, guardar versões e comparar cenários.
