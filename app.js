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
    transparent: true,
    saoEnabled: true,
    edgesEnabled: true
});

// 🛑 GARANTE QUE O VIEWER SE AJUSTE ÀS DIMENSÕES DA JANELA
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Não precisa chamar flyTo aqui, pois o xeokit ajusta a projeção automaticamente.
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); // Chama na inicialização

// -----------------------------------------------------------------------------
// 2. Carregamento do Modelo e Ajuste da Câmera
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

const sceneModel = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", // Verifique se o caminho está correto
    edges: true
});

sceneModel.on("loaded", () => {
    // 🛑 AQUI ESTÁ A SOLUÇÃO: Pula a câmera para encaixar o modelo na visualização.
    viewer.cameraFlight.jumpTo(sceneModel); 
    console.log("Modelo 3D carregado e câmera ajustada para o zoom correto.");
});

// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca (Mantido do código anterior)
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

function setMeasurementMode(mode, clickedButton) {
    // ... (Lógica de ativação/desativação de modos e botões)
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));

    if (mode === 'angle') {
        angleMeasurementsMouseControl.activate();
    } else if (mode === 'distance') {
        distanceMeasurementsMouseControl.activate();
    }
    
    if (clickedButton) {
         clickedButton.classList.add('active');
    } else if (mode === 'angle') {
        document.getElementById('btnAngle').classList.add('active'); // Garante que o estado inicial reflita o modo
    }

    // Reseta medições incompletas ao trocar de modo
    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 
}

window.setMeasurementMode = setMeasurementMode;

// Menu de Contexto (Simplificado para o exemplo)
const contextMenu = new ContextMenu({ /* ... */ });

function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        contextMenu.context = { measurement: measurement };
        contextMenu.show(e.event.clientX, e.event.clientY);
        e.event.preventDefault();
    });
    // ... (mouseOver/mouseLeave events)
}

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);

// Inicializa o modo padrão
setMeasurementMode('angle', document.getElementById('btnAngle'));
