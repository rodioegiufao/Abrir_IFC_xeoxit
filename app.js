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
    // 🛑 ATUALIZAÇÃO AQUI: Remove 'transparent: true' e define a cor de fundo.
    transparent: false, // Não precisa ser transparente se você definir uma cor sólida
    saoEnabled: true,
    edgesEnabled: true,
    
    // 🛑 NOVA CONFIGURAÇÃO DE COR DE FUNDO (Cinza Claro)
    backgroundColor: [0.8, 0.8, 0.8] 
});


// GARANTE QUE O VIEWER SE AJUSTE ÀS DIMENSÕES DA JANELA (Correção da tela minúscula)
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); // Chama na inicialização


// -----------------------------------------------------------------------------
// 2. Plugins de Medição e Configuração de Controle
// -----------------------------------------------------------------------------

const angleMeasurement = new AngleMeasurementsPlugin(viewer);
const distanceMeasurement = new DistanceMeasurementsPlugin(viewer);

const angleControl = new AngleMeasurementsMouseControl(angleMeasurement);
const distanceControl = new DistanceMeasurementsMouseControl(distanceMeasurement);

// Estado inicial: Apenas o controle de ângulo ativo
angleControl.active = false;
distanceControl.active = false;


// -----------------------------------------------------------------------------
// 3. Função Global para Mudar o Modo de Medição (Chamada pelo HTML)
// -----------------------------------------------------------------------------

function setMeasurementMode(mode, button) {
    // 1. Desativa todos os controles
    angleControl.active = false;
    distanceControl.active = false;
    
    // 2. Ativa o controle selecionado
    if (mode === 'angle') {
        angleControl.active = true;
        distanceControl.reset(); // Limpa a medição de distância se houver
    } else if (mode === 'distance') {
        distanceControl.active = true;
        angleControl.reset(); // Limpa a medição de ângulo se houver
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
// 4. Menu de Contexto (Deletar Medição) - Mantido para funcionalidade completa
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
// 5. Carregamento do Modelo XKT (Exemplo)
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    src: "https://xeokit.github.io/xeokit-sdk/assets/models/xkt/Slab.xkt", // Exemplo padrão
    // src: "caminho/para/seu/arquivo.xkt" // Se você tiver um arquivo XKT
    
    // Se precisar de conversão de IFC para XKT, é um passo separado.
});

