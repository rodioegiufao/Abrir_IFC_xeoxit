// app.js

import {
    Viewer, 
    XKTLoaderPlugin, 
    AngleMeasurementsPlugin, 
    AngleMeasurementsMouseControl, 
    DistanceMeasurementsPlugin,
    DistanceMeasurementsMouseControl,
    ContextMenu, 
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


function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 


// -----------------------------------------------------------------------------
// 2. Cubo de Navegação (NavCubePlugin) - Mantido, pois não causa erro.
// -----------------------------------------------------------------------------

// Usando as configurações do último teste bem-sucedido.
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

// 🛑 CORREÇÃO AQUI: Nenhum controle de medição deve estar ativo por padrão.
angleControl.enabled = false;
distanceControl.enabled = false;


// -----------------------------------------------------------------------------
// 4. Função Global para Mudar o Modo de Medição (Chamada pelo HTML)
// -----------------------------------------------------------------------------

function setMeasurementMode(mode, button) {
    // 1. Desativa todos os controles
    angleControl.enabled = false; 
    distanceControl.enabled = false; 
    
    // 2. Reseta as medições antigas se estiver ativando um novo modo
    if (mode === 'angle') {
        angleControl.enabled = true; 
        distanceControl.reset(); 
    } else if (mode === 'distance') {
        distanceControl.enabled = true; 
        angleControl.reset(); 
    } else {
        // Modo 'none' (Desativar)
        angleControl.reset(); 
        distanceControl.reset(); 
    }
    
    // 3. Atualiza o estilo dos botões (feedback visual)
    const buttons = document.querySelectorAll('.tool-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Adiciona 'active' apenas se não for o modo 'none'
    if (mode !== 'none' && button) {
        button.classList.add('active');
    } else if (mode === 'none' && button) {
        // Se for o botão de desativar, ele fica ativo (opcional, mas claro)
        button.classList.add('active'); 
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
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
// 6. Carregamento do Modelo XKT (Exemplo) - Mantido o link que corrigiu o 404
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    src: "https://dl.dropboxusercontent.com/s/s7k99320e8y051s/Duplex.xkt", 
});
