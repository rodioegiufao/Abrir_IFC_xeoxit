// app.js

import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu, 
    PointerLens // O PointerLens não é estritamente necessário, mas mantido
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


function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 

// -----------------------------------------------------------------------------
// 2. Plugins de Medição e Configuração de Controle
// -----------------------------------------------------------------------------

const angleMeasurement = new AngleMeasurementsPlugin(viewer);
const distanceMeasurement = new DistanceMeasurementsPlugin(viewer);

const angleControl = new AngleMeasurementsMouseControl(angleMeasurement);
const distanceControl = new DistanceMeasurementsMouseControl(distanceMeasurement);

// 🛑 CORREÇÃO: Ambos desativados por padrão
angleControl.enabled = false;
distanceControl.enabled = false;


// -----------------------------------------------------------------------------
// 3. Função Global para Mudar o Modo de Medição (Chamada pelo HTML)
// -----------------------------------------------------------------------------

function setMeasurementMode(mode, button) {
    // 1. Desativa todos os controles
    angleControl.enabled = false; 
    distanceControl.enabled = false; 
    
    // 2. Reseta as medições antigas
    angleControl.reset(); 
    distanceControl.reset(); 
    
    // 3. Ativa o controle selecionado
    if (mode === 'angle') {
        angleControl.enabled = true; 
    } else if (mode === 'distance') {
        distanceControl.enabled = true; 
    }
    
    // 4. Atualiza o estilo dos botões (feedback visual)
    const buttons = document.querySelectorAll('.tool-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (button) {
        button.classList.add('active');
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
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

setupMeasurementEvents(angleMeasurement);
setupMeasurementEvents(distanceMeasurement);

// -----------------------------------------------------------------------------
// 5. Carregamento do Modelo XKT (Exemplo) - Usando o link mais estável
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    // 🛑 CORREÇÃO FINAL: Usando o link mais estável para o modelo Duplex do próprio xeokit
    src: "https://xkt.xeokit.io/v2/Duplex.xkt", 
});
