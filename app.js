// app.js

import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,      // 🛑 Novo: Plugin de Distância
    DistanceMeasurementsMouseControl, // 🛑 Novo: Controle de Distância
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

viewer.camera.eye = [-3.93, 2.85, 27.01]; 
viewer.camera.look = [4.40, 3.72, 8.89];
viewer.camera.up = [-0.01, 0.99, 0.039];

const xktLoader = new XKTLoaderPlugin(viewer);

const sceneModel = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", 
    edges: true
});

sceneModel.on("loaded", () => {
    viewer.cameraFlight.jumpTo(sceneModel);
});

// -----------------------------------------------------------------------------
// 2. Plugins de Medição
// -----------------------------------------------------------------------------

// Plugin de Ângulo (Existente)
const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});

// 🛑 Novo: Plugin de Distância
const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});

// Desativa o controle de distância inicialmente
distanceMeasurementsMouseControl.deactivate(); 

// -----------------------------------------------------------------------------
// 3. Função de Troca de Modo (O essencial para o seu pedido)
// -----------------------------------------------------------------------------

/**
 * Ativa o controle de medição especificado e desativa os outros.
 * @param {('angle'|'distance'|'none')} mode - O modo de medição a ser ativado.
 * @param {HTMLElement} clickedButton - O botão HTML que foi clicado.
 */
function setMeasurementMode(mode, clickedButton) {
    // 1. Desativa e reseta todos os controles
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 

    // 2. Remove o estado 'active' de todos os botões (para não ter dois ativos)
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    // 3. Ativa o controle desejado e define o botão como ativo
    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
        clickedButton.classList.add('active');
        console.log("Modo de medição: Ângulo ativado.");
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
        clickedButton.classList.add('active');
        console.log("Modo de medição: Distância ativado.");
    } else if (mode === 'none') {
        console.log("Modo de medição desativado.");
        // O botão 'Desativar' pode ser mantido ativo para indicar que nenhuma ferramenta está em uso.
        // clickedButton.classList.add('active'); 
    }
}

// 🛑 Expor a função ao escopo global (window) para que o HTML possa chamá-la.
window.setMeasurementMode = setMeasurementMode;

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Simplificado para Ângulo/Distância)
// -----------------------------------------------------------------------------

// Este Menu de Contexto só será necessário se você quiser deletar a medição com 
// o botão direito. Vou simplificar para aplicar a ambos os plugins.

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

// Função para manipular os eventos de mouse dos plugins de medição
function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        contextMenu.context = { 
            measurement: e.angleMeasurement || e.distanceMeasurement // O objeto de medição vem diferente
        };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });

    plugin.on("mouseOver", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        measurement.setHighlighted(true);
    });

    plugin.on("mouseLeave", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        if (!contextMenu.shown || contextMenu.context.measurement.id !== measurement.id) {
            measurement.setHighlighted(false);
        }
    });
}

// Configura os eventos para ambos os plugins
setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);

// Inicializa o modo padrão (Medir Ângulo) e simula o clique no botão
setMeasurementMode('angle', document.getElementById('btnAngle'));
