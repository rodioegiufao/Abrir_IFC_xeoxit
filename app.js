// app.js

import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu, 
    PointerLens 
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

// -----------------------------------------------------------------------------
// 1. Configuração do Viewer
// -----------------------------------------------------------------------------

const viewer = new Viewer({
    canvasId: "meuCanvas",
    transparent: true,
    saoEnabled: true,
    edgesEnabled: true
});

// Configuração inicial da câmera (exemplo do seu código anterior)
viewer.camera.eye = [-3.93, 2.85, 27.01]; 
viewer.camera.look = [4.40, 3.72, 8.89];
viewer.camera.up = [-0.01, 0.99, 0.039];

const xktLoader = new XKTLoaderPlugin(viewer);

const sceneModel = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", // Altere o caminho se for diferente
    edges: true
});

sceneModel.on("loaded", () => {
    viewer.cameraFlight.jumpTo(sceneModel);
    console.log("Modelo 3D carregado. Medição de Ângulo ativada por padrão.");
});

// -----------------------------------------------------------------------------
// 2. Plugins de Medição
// -----------------------------------------------------------------------------

// Plugin e controle de Ângulo
const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});

// Plugin e controle de Distância
const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});

// Desativa o controle de distância inicialmente
distanceMeasurementsMouseControl.deactivate(); 

// -----------------------------------------------------------------------------
// 3. Função de Troca de Modo e Redimensionamento (Soluções)
// -----------------------------------------------------------------------------

/**
 * Ativa o controle de medição especificado e desativa os outros.
 * Esta função é exposta ao escopo global (window) para ser chamada pelos botões HTML.
 * * @param {('angle'|'distance'|'none')} mode - O modo de medição a ser ativado.
 * @param {HTMLElement} clickedButton - O botão HTML que foi clicado.
 */
function setMeasurementMode(mode, clickedButton) {
    // 1. Desativa e reseta todos os controles
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 

    // 2. Remove o estado 'active' de todos os botões
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    // 3. Ativa o controle desejado
    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
        clickedButton.classList.add('active');
        console.log("Modo: Medição de Ângulo ativado.");
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
        clickedButton.classList.add('active');
        console.log("Modo: Medição de Distância ativado.");
    } else if (mode === 'none') {
        clickedButton.classList.add('active'); // O botão 'Desativar' fica ativo
        console.log("Modo: Medição desativado (Câmera livre).");
    }
}

// 🛑 EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick'
window.setMeasurementMode = setMeasurementMode;


// 🛑 CORREÇÃO DO REDIMENSIONAMENTO DO CANVAS PARA 100% DA TELA
function onWindowResize() {
    // Redimensiona o canvas para caber no novo tamanho da janela
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // O xeokit ajustará a projeção automaticamente com base nas novas dimensões do canvas.
}

window.addEventListener('resize', onWindowResize);

// Chama na inicialização para garantir que o tamanho inicial seja 100%
onWindowResize();

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Deletar Medição)
// -----------------------------------------------------------------------------

const contextMenu = new ContextMenu({
    items: [
        [
            {
                title: "Deletar Medição",
                doAction: function (context) {
                    context.measurement.destroy();
                }
            }
        ]
    ]
});

// Função genérica para configurar os eventos de mouse (Contexto/Highlight) para ambos os plugins
function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        // Pega o objeto de medição, seja ele de ângulo ou distância
        const measurement = e.angleMeasurement || e.distanceMeasurement;

        contextMenu.context = { 
            measurement: measurement
        };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });

    plugin.on("mouseOver", (e) => {
        (e.angleMeasurement || e.distanceMeasurement).setHighlighted(true);
    });

    plugin.on("mouseLeave", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        // Evita desativar o highlight se o menu de contexto estiver aberto
        if (!contextMenu.shown || contextMenu.context.measurement.id !== measurement.id) {
            measurement.setHighlighted(false);
        }
    });
}

// Configura os eventos para ambos os plugins
setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);
