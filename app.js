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
// 2. Carregamento dos Modelos e Ajuste da Câmera (💥 FOCO AQUI 💥)
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

let modelsLoadedCount = 0;
const totalModels = 2; // Número de modelos que esperamos carregar

// Função para ajustar a câmera após o carregamento
function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    // Quando o ÚLTIMO modelo terminar de carregar, ajustamos a câmera para a cena inteira.
    if (modelsLoadedCount === totalModels) {
        viewer.cameraFlight.jumpTo(viewer.scene); // Enquadra TUDO na cena
        console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
        
        // 🛑 MUDANÇA AQUI: Ativa o modo 'none' (Desativar) por padrão, conforme solicitado.
        // O botão "Desativar" (btnDeactivate) ficará com a classe 'active'.
        setMeasurementMode('none', document.getElementById('btnDeactivate')); 
    }
}


// 💥 CARREGAMENTO DO MODELO 1: meu_modelo.xkt
const model1 = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", 
    edges: true
});

model1.on("loaded", adjustCameraOnLoad);
model1.on("error", (err) => {
    console.error("Erro ao carregar meu_modelo.xkt:", err);
    adjustCameraOnLoad(); // Ainda conta como carregado/tentado
});


// 💥 CARREGAMENTO DO MODELO 2: modelo-02.xkt
const model2 = xktLoader.load({
    id: "meuModeloBIM_02", // ID ÚNICO é crucial
    src: "assets/modelo-02.xkt", 
    edges: true
});

model2.on("loaded", adjustCameraOnLoad);
model2.on("error", (err) => {
    console.error("Erro ao carregar modelo-02.xkt:", err);
    adjustCameraOnLoad(); // Ainda conta como carregado/tentado
});


// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca
// -----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
// Garante que o controle de ângulo inicie desativado
angleMeasurementsMouseControl.deactivate(); 


const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
// Garante que o controle de distância inicie desativado
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
    // Se um botão foi clicado ou o modo é 'none' (botão 'Desativar'), ele recebe a classe 'active'.
    if (clickedButton) {
         clickedButton.classList.add('active');
    }

    // Reseta medições incompletas ao trocar de modo
    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 
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

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);

// -----------------------------------------------------------------------------
// 5. Cubo de Navegação (NavCube) - Implementação Adicionada
// -----------------------------------------------------------------------------

// NOVO: Instancia o NavCubePlugin
// Configurado para usar o canvas 'myNavCubeCanvas' (adicionado no index.html)
new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas", // ID do canvas dedicado
    visible: true,
    size: 150, 
    alignment: "bottomRight", 
    bottomMargin: 20, 
    rightMargin: 20 
});

