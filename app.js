// app.js

import {
    Viewer,
    LocaleService,
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
    // CONFIGURAÇÃO DE LOCALIZAÇÃO ADICIONADA:
    localeService: new LocaleService({
        messages: {
            "pt": { // Português
                "NavCube": {
                    "front": "Frente",
                    "back": "Trás",
                    "top": "Topo",
                    "bottom": "Baixo",
                    "left": "Esquerda",
                    "right": "Direita"
                }
            }
        },
        locale: "pt" // Define o idioma padrão como Português
    })
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
function resetModelVisibility() {
    if (modelIsolateController) {
        // Volta a exibir todos os objetos
        modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), true);
        // Remove X-ray
        modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false);
        // Remove destaque
        modelIsolateController.setObjectsHighlighted(modelIsolateController.getObjectsIds(), false);
        // Centraliza a câmera no modelo inteiro
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
}


function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    if (modelsLoadedCount === totalModels) {
        viewer.cameraFlight.jumpTo(viewer.scene); 
        console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
        
        setMeasurementMode('none', document.getElementById('btnDeactivate')); 
        
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
    
    treeView = new TreeViewPlugin(viewer, {
        containerElement: document.getElementById("treeViewContainer"),
        hierarchy: "containment", 
        autoExpandDepth: 2 
    });

    modelIsolateController = viewer.scene.objects;

    // Ouve o evento de "seleção" no TreeView
    treeView.on("nodeClicked", (event) => {
        const entityId = event.entityId;
        
        // Verifica se há alguma entidade associada ao nó
        if (entityId && viewer.scene.getObjectsInSubtree(entityId).length > 0) {
            
            const subtreeIds = viewer.scene.getObjectsInSubtree(entityId);
            
            // Isola (mostra apenas) a parte do modelo (pavimento, por exemplo) clicada
            modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), true); // X-ray em TUDO
            modelIsolateController.setObjectsXRayed(subtreeIds, false); // Tira o X-ray do subconjunto isolado

            modelIsolateController.isolate(subtreeIds); // Isola o subconjunto
            
            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entityId),
                duration: 0.5
            });

        } else {
            // Se o usuário clicar em um nó que não contém objetos (como o nó raiz do projeto ou um item folha)
            // Apenas reseta a visibilidade.
            resetModelVisibility(); 
        }
    });
}

/**
 * Alterna a visibilidade do contêiner do TreeView e reseta a visibilidade do modelo se estiver fechando.
 */
function toggleTreeView() {
    const container = document.getElementById('treeViewContainer');
    
    if (container.style.display === 'block') {
        container.style.display = 'none';
        // Ação de "Mostrar Tudo" ao fechar o painel
        resetModelVisibility();
    } else {
        container.style.display = 'block';
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView;
window.resetModelVisibility = resetModelVisibility;




