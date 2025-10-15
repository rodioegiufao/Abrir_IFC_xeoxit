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
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// -----------------------------------------------------------------------------

const viewer = new Viewer({
    canvasId: "meuCanvas",
    transparent: false, 
    saoEnabled: true,
    edgesEnabled: true,
    
    // Fundo Cinza Claro, conforme solicitado
    backgroundColor: [0.8, 0.8, 0.8] 
});

// GARANTE QUE O VIEWER SE AJUSTE ÀS DIMENSÕES DA JANELA
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); // Chama na inicialização

// -----------------------------------------------------------------------------
// 2. Carregamento do Projeto via MANIFESTO (💥 FOCO AQUI 💥)
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

// O plugin carrega o manifesto, que por sua vez carrega todos os modelos internos.
const projectModel = xktLoader.load({
    id: "meuProjetoCompleto",
    // Carrega o arquivo JSON do manifesto
    src: "assets/meu_projeto.json" 
});

projectModel.on("loaded", () => {
    // Ajusta a câmera para enquadrar TODO o projeto (todos os modelos)
    viewer.cameraFlight.jumpTo(viewer.scene); 
    console.log("Projeto carregado via Manifesto JSON e câmera ajustada.");
    
    // Ativa o modo de medição de ângulo por padrão
    setMeasurementMode('angle', document.getElementById('btnAngle')); 
});

projectModel.on("error", (err) => {
    console.error("Erro ao carregar o Manifesto ou modelos do projeto:", err);
});

// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca
// -----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});

const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
distanceMeasurementsMouseControl.deactivate(); 

/**
 * Ativa o controle de medição especificado e desativa os outros.
 */
function setMeasurementMode(mode, clickedButton) {
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
    }
    
    // Define o estado ativo do botão
    if (clickedButton) {
         clickedButton.classList.add('active');
    } else if (mode === 'angle') {
        const btn = document.getElementById('btnAngle');
        if (btn) btn.classList.add('active');
    }

    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 
}

window.setMeasurementMode = setMeasurementMode;

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

function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        contextMenu.context = { measurement: measurement };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });

    plugin.on("mouseOver", (e) => {
        (e.angleMeasurement || e.distanceMeasurement).setHighlighted(true);
    });

    plugin.on("mouseLeave", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        if (!contextMenu.shown || contextMenu.context.measurement.id !== measurement.id) {
            measurement.setHighlighted(false);
        }
    });
}

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);
