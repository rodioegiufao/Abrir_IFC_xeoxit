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
    NavCubePlugin,
    TreeViewPlugin
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

// Variável global para o TreeView (necessária para as funções de toggle)
let treeView; 
let modelIsolateController;

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
const totalModels = 2; 

// Função para ajustar a câmera após o carregamento
function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    if (modelsLoadedCount === totalModels) {
        viewer.cameraFlight.jumpTo(viewer.scene); 
        console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
        
        // Ativa o modo 'none' (Desativar) por padrão
        setMeasurementMode('none', document.getElementById('btnDeactivate')); 
        
        // Inicializa o controle de isolamento após o carregamento de todos os modelos
        setupModelIsolateController();
    }
}


// CARREGAMENTO DO MODELO 1: meu_modelo.xkt
const model1 = xktLoader.load({
    id: "meuModeloBIM",
    src: "assets/meu_modelo.xkt", 
    edges: true
});

model1.on("loaded", adjustCameraOnLoad);
model1.on("error", (err) => {
    console.error("Erro ao carregar meu_modelo.xkt:", err);
    adjustCameraOnLoad(); 
});


// CARREGAMENTO DO MODELO 2: modelo-02.xkt
const model2 = xktLoader.load({
    id: "meuModeloBIM_02", 
    src: "assets/modelo-02.xkt", 
    edges: true
});

model2.on("loaded", adjustCameraOnLoad);
model2.on("error", (err) => {
    console.error("Erro ao carregar modelo-02.xkt:", err);
    adjustCameraOnLoad(); 
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


// -----------------------------------------------------------------------------
// 6. TreeViewPlugin e Lógica de Isolamento (NOVO)
// -----------------------------------------------------------------------------

/**
 * Inicializa o TreeViewPlugin e configura a lógica de isolamento.
 */
function setupModelIsolateController() {
    
    // 6.1. Inicializa o TreeViewPlugin com hierarquia de contenção
    treeView = new TreeViewPlugin(viewer, {
        containerElement: document.getElementById("treeViewContainer"),
        // Garante que o TreeView utilize a estrutura de níveis/pavimentos
        hierarchy: "containment", 
        autoExpandDepth: 2 
    });

    // 6.2. Armazena o controlador de isolamento da cena
    modelIsolateController = viewer.scene.objects;

    // 6.3. Ouve o evento de "seleção" no TreeView
    treeView.on("nodeClicked", (event) => {
        const entityId = event.entityId;
        
        // Verifica se é o clique no Site (nó raiz, que representa o modelo inteiro)
        if (entityId && viewer.scene.getObjectsInSubtree(entityId).length > 0) {
            
            // Isola (mostra apenas) a parte do modelo (pavimento, por exemplo) clicada
            modelIsolateController.setObjectsXRayed([entityId], true); // X-ray no resto
            modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false); // Tira o X-ray de todos

            // Isola o subconjunto de objetos que estão na subárvore deste nó
            modelIsolateController.isolate(viewer.scene.getObjectsInSubtree(entityId)); 
            
            // Opcional: Centraliza a câmera no objeto isolado
            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entityId),
                duration: 0.5
            });

        } else {
            // Se o usuário clicar em um objeto folha ou em um nó vazio, mostra o modelo inteiro
            showAll(); 
        }
    });
}

/**
 * Alterna a visibilidade do contêiner do TreeView.
 */
function toggleTreeView() {
    const container = document.getElementById('treeViewContainer');
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
    }
}

/**
 * Mostra todos os objetos e reseta o isolamento.
 */
function showAll() {
    if (modelIsolateController) {
        modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), true);
        modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false);
        modelIsolateController.setObjectsHighlighted(modelIsolateController.getObjectsIds(), false);
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView;
window.showAll = showAll;


