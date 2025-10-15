// app.js

// O import agora funciona porque o index.html está carregando o SDK como módulo.
import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    ContextMenu, 
    PointerLens 
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

// -----------------------------------------------------------------------------
// 1. Configuração Básica do Viewer
// -----------------------------------------------------------------------------

const viewer = new Viewer({
    canvasId: "meuCanvas",
    transparent: true,
    saoEnabled: true,
    edgesEnabled: true
});

// Posição de câmera (copiada do seu exemplo para uma boa visualização inicial)
viewer.camera.eye = [-3.93, 2.85, 27.01]; 
viewer.camera.look = [4.40, 3.72, 8.89];
viewer.camera.up = [-0.01, 0.99, 0.039];

// -----------------------------------------------------------------------------
// 2. Carregamento do Modelo XKT
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

const sceneModel = xktLoader.load({
    id: "meuModeloBIM",
    // Usando o caminho do seu arquivo XKT original
    src: "assets/meu_modelo.xkt", 
    edges: true
});

sceneModel.on("loaded", () => {
    viewer.cameraFlight.jumpTo(sceneModel);
    console.log("Modelo carregado e pronto para medição de ângulo.");
});

sceneModel.on("error", (err) => {
    console.error("Erro ao carregar modelo:", err);
});

// -----------------------------------------------------------------------------
// 3. Medição de Ângulo (Plugins)
// -----------------------------------------------------------------------------

// 3.1. Plugin principal para gerenciar as medições
const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, {
    zIndex: 100000 // Garante que as medições fiquem acima do modelo
});

// 3.2. Controle de mouse para criar medições
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), // Adiciona um zoom visual no ponteiro
    snapping: true // Permite que o clique se ajuste aos vértices/arestas
});

// Ativa a medição: clique no modelo para selecionar os três pontos do ângulo.
angleMeasurementsMouseControl.activate();

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Clique Direito)
// -----------------------------------------------------------------------------

let endMeasurementEdit = null;

const angleMeasurementsContextMenu = new ContextMenu({
    items: [
        [
            {
                title: "Deletar Medição",
                doAction: function (context) {
                    context.angleMeasurement.destroy();
                }
            }
        ],
        [
            {
                title: "Cancelar Medição Atual",
                doAction: function () {
                    angleMeasurementsMouseControl.reset();
                }
            },
            {
                getTitle: () => "Encerrar Edição",
                getEnabled: () => !!endMeasurementEdit,
                doAction: () => {
                    if (endMeasurementEdit) endMeasurementEdit(); 
                }
            }
        ]
    ],
    enabled: true 
});

// Evento para mostrar o menu de contexto (clique direito) na medição
angleMeasurementsPlugin.on("contextMenu", (e) => {
    angleMeasurementsContextMenu.context = { 
        angleMeasurement: e.angleMeasurement
    };
    angleMeasurementsContextMenu.show(e.event.clientX, e.event.clientY);
    e.event.preventDefault();
});

// Listener para realçar a medição ao passar o mouse (igual ao seu exemplo)
angleMeasurementsPlugin.on("mouseOver", (e) => {
    e.angleMeasurement.setHighlighted(true);
});

angleMeasurementsPlugin.on("mouseLeave", (e) => {
    if (angleMeasurementsContextMenu.shown && angleMeasurementsContextMenu.context.angleMeasurement.id === e.angleMeasurement.id) {
        return;
    }
    e.angleMeasurement.setHighlighted(false);
});