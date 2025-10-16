// app.js

import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu, 
    PointerLens,
    NavCubePlugin 
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

// -----------------------------------------------------------------------------
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// -----------------------------------------------------------------------------

const viewer = new Viewer({
    canvasId: "meuCanvas",
    transparent: false, 
    saoEnabled: true,
    edgesEnabled: true,
    backgroundColor: [0.8, 0.8, 0.8] 
});


// GARANTE QUE O VIEWER SE AJUSTE ÀS DIMENSÕES DA JANELA
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 


// -----------------------------------------------------------------------------
// 2. Cubo de Navegação (NavCubePlugin)
// -----------------------------------------------------------------------------

const navCube = new NavCubePlugin(viewer, {
    canvasId: "navCubeCanvas",
    visible: true,
    size: 200, 
    alignment: "bottomRight", 
});

// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Configuração de Controle
// -----------------------------------------------------------------------------

const angleMeasurement = new AngleMeasurementsPlugin(viewer);
const distanceMeasurement = new DistanceMeasurementsPlugin(viewer);

const angleControl = new AngleMeasurementsMouseControl(angleMeasurement);
const distanceControl = new DistanceMeasurementsMouseControl(distanceMeasurement);

// Estado inicial: Apenas o controle de ângulo ativo
// 🛑 CORREÇÃO DE ERRO: Usando .enabled = true/false
angleControl.enabled = true;
distanceControl.enabled = false;


// -----------------------------------------------------------------------------
// 4. Função Global para Mudar o Modo de Medição (Chamada pelo HTML)
// -----------------------------------------------------------------------------

function setMeasurementMode(mode, button) {
    // 1. Desativa todos os controles
    angleControl.enabled = false; // Corrigido
    distanceControl.enabled = false; // Corrigido
    
    // 2. Ativa o controle selecionado
    if (mode === 'angle') {
        angleControl.enabled = true; // Corrigido
        distanceControl.reset(); 
    } else if (mode === 'distance') {
        distanceControl.enabled = true; // Corrigido
        angleControl.reset(); 
    } else {
        // Modo 'none' (Desativar)
        angleControl.reset(); 
        distanceControl.reset(); 
    }
    
    // 3. Atualiza o estilo dos botões (feedback visual)
    const buttons = document.querySelectorAll('.tool-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (button) {
        button.classList.add('active');
    }
}

// 🛑 EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.setMeasurementMode = setMeasurementMode;

// -----------------------------------------------------------------------------
// 5. Menu de Contexto (Deletar Medição) 
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

setupMeasurementEvents(angleMeasurement);
setupMeasurementEvents(distanceMeasurement);

// -----------------------------------------------------------------------------
// 6. Carregamento do Modelo XKT (Exemplo)
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    src: "https://xeokit.github.io/xeokit-sdk/assets/models/xkt/Slab.xkt", // Exemplo padrão
});
