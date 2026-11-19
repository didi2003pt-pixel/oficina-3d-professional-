/**
 * Layout conceptual. Todos os valores são ilustrativos, em metros.
 * Nunca utilizar estas dimensões para obra, certificação ou manobras reais.
 */
export const LAYOUT = Object.freeze({
  width: 42,
  depth: 28,
  wallHeight: 7.4,
  entrance: { wall: 'left', z: -3, opening: 6.8, height: 5.8 },
  alignmentShiftX: 0.9, // ajuste visual conceptual ligeiro para a direita
  exit: { wall: 'front', x: 10.5, opening: 6.8, height: 5.8 },
  officeX: 15,
  route: [
    [-20.3, -3], [-18, -3], [-15.8, -3], [-14.05, -3], [-12.8, -3],
    [-12, -4.8], [-10, -5.2], [-3, -5.2], [4, -5.2],
    [9, -5.2], [11, -3], [11, 1.5], [11, 7], [11, 13.7]
  ]
});

export const ZONES = [
  { id: 'entrance', name: 'Entrada de veículos', description: 'Portão na parede lateral esquerda, com corredor de acesso ao interior.', position: [-20.6, 3.7, LAYOUT.entrance.z] },
  { id: 'flow', name: 'Circulação principal', description: 'Trajeto orientador desde a entrada lateral até à saída frontal direita. É conceptual e não valida raios de viragem.', position: [0, .25, -5.3] },
  { id: 'heavy', name: 'Pneus pesados', description: 'Zona de montagem e desmontagem de pneus para veículos pesados, com máquina e armazenamento temporário.', position: [-14, 2.3, -10.5] },
  { id: 'balance', name: 'Montagem e equilibragem', description: 'Equipamentos de montagem e equilibragem, bancadas e armários de ferramentas.', position: [-4.3, 2.3, -10.5] },
  { id: 'alignment', name: 'Alinhamento', description: 'Plataformas, sensores e estação de alinhamento. Não existe uma zona adicional de elevador ao lado.', position: [6.2 + LAYOUT.alignmentShiftX, 2.2, -10.5] },
  { id: 'truck', name: 'Zona central de veículos', description: 'Área central de trabalho. Escolhe um veículo para o inspecionar.', position: [-7.1, 2.9, 3.7] },
  { id: 'lift', name: 'Equipamento de dois postes', description: 'Estrutura vermelha de dois postes, separada da área de alinhamento e preservada na zona central.', position: [3.4, 2.9, 4.1] },
  { id: 'rack', name: 'Armazém de pneus', description: 'Rack metálico vermelho de várias prateleiras, com pneus individuais em três dimensões.', position: [-11.2, 2.4, 10.8] },
  { id: 'office', name: 'Zona administrativa', description: 'Balneários, receção e espera, sala de reuniões e escritório, com divisórias envidraçadas.', position: [17.7, 3, 0.1] },
  { id: 'exit', name: 'Saída de veículos', description: 'Saída ampla na fachada frontal direita, com área livre de obstáculos e sem três caixas de estacionamento.', position: [10.5, 3.3, 13.9] }
];

export const TOUR = [
  { title: 'Visão geral', description: 'A estrutura completa da oficina, os percursos e as divisões.', position: [44, 33, 47], target: [0, 1.3, 0], zone: null },
  { title: 'Entrada lateral', description: 'Acesso de veículos pesados pela parede esquerda.', position: [-30, 15, 7], target: [-17.5, 1.5, LAYOUT.entrance.z], zone: 'entrance' },
  { title: 'Percurso de circulação', description: 'Trajeto amarelo conceptual da entrada até à saída.', position: [24, 25, -2], target: [0, .2, -4], zone: 'flow' },
  { title: 'Montagem de pneus pesados', description: 'Máquina de pneus pesados e armazenamento de rodas.', position: [-25, 13, 0], target: [-14.3, 1.7, -10.4], zone: 'heavy' },
  { title: 'Montagem e equilibragem', description: 'Máquinas, ferramentas, bancada e equilibradora.', position: [-5, 15, 4], target: [-4.2, 1.6, -10.4], zone: 'balance' },
  { title: 'Alinhamento', description: 'Plataforma vermelha, monitores e sensores.', position: [19 + LAYOUT.alignmentShiftX, 14, 0], target: [6.2 + LAYOUT.alignmentShiftX, 1.3, -10.5], zone: 'alignment' },
  { title: 'Área central e veículos', description: 'Área de trabalho livre. Escolhe um veículo para o inspecionar nesta etapa.', position: [-21, 17, 20], target: [-7.2, 2.2, 3.2], zone: 'truck' },
  { title: 'Equipamento de dois postes', description: 'Equipamento preservado na área central da oficina.', position: [17, 13, 17], target: [3.4, 2.3, 4.1], zone: 'lift' },
  { title: 'Armazenamento de pneus', description: 'Rack industrial vermelho com pneus em diversos níveis.', position: [-20, 12, 25], target: [-11.2, 2, 10.7], zone: 'rack' },
  { title: 'Espaços administrativos', description: 'Balneários, receção, sala de reuniões e escritório.', position: [31, 19, 12], target: [17.5, 2, 0], zone: 'office' },
  { title: 'Saída ampla', description: 'Saída frontal direita sem obstáculos e sem antigos lugares marcados.', position: [23, 15, 25], target: [10.5, 1.4, 11.5], zone: 'exit' }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map(z => [z.id, z]));
