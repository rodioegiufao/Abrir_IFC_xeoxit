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
    TreeViewPlugin,
    SectionPlanesPlugin,
    ModelIsolateController 
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

let treeView; 
let modelIsolateController; 
let sectionPlanesPlugin; 
let horizontalSectionPlane; 

// -----------------------------------------------------------------------------
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// -----------------------------------------------------------------------------

const viewer = new Viewer({

    canvasId: "meuCanvas",
    transparent: false, 
    saoEnabled: true,
    edgesEnabled: true,
    backgroundColor: [0.8, 0.8, 0.8],
    
    // CONFIGURAÇÃO DE LOCALIZAÇÃO (NavCube em Português)
    localeService: new LocaleService({
        messages: {
            "pt": { // Português
                "NavCube": {
                    "front": "Frente",
                    "back": "Trás",
                    "top": "Topo",
                    "bottom": "Baixo",
                    "left": "Esquerda",
                    "right": "Direita",
                    "front-top": "Frente/Topo",
                    "front-bottom": "Frente/Baixo",
                    "back-top": "Trás/Topo",
                    "back-bottom": "Trás/Baixo",
                    "front-left": "Frente/Esquerda",
                    "front-right": "Frente/Direita",
                    "back-left": "Trás/Esquerda",
                    "back-right": "Trás/Direita"
                }
            }
        },
        // Força o uso do Português
        locale: "pt" 
    })
});

const scene = viewer.scene;

// GARANTE QUE O VIEWER SE AJUSTE ÀS DIMENSÕES DA JANELA
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 

// -----------------------------------------------------------------------------
// 2. Plugins e Controles
// -----------------------------------------------------------------------------

// 2.1. NavCubePlugin (Cubo de Navegação)
new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas",
    visible: true,
    size: 150, // Tamanho reduzido para melhor visualização
    alignment: "bottomRight",
    bottomMargin: 20,
    rightMargin: 20
});

// 2.2. SectionPlanesPlugin (Plano de Corte)
sectionPlanesPlugin = new SectionPlanesPlugin(viewer, {
    overviewCanvasId: "mySectionPlanesOverviewCanvas",
    overviewVisible: false // Visão geral do plano de corte desativada por padrão
});

// 2.3. TreeViewPlugin (Árvore de Estrutura)
treeView = new TreeViewPlugin(viewer, {
    containerElement: document.getElementById("treeViewContainer"),
    hierarchy: "containment", // Hierarquia por Containment (Níveis/Pavimentos)
    autoExpandDepth: 2 // Expande os primeiros níveis automaticamente
});

// 2.4. XKTLoaderPlugin para carregar o modelo
const xktLoader = new XKTLoaderPlugin(viewer); 

// 2.5. ModelIsolateController para isolamento na TreeView
modelIsolateController = new ModelIsolateController(viewer);


// -----------------------------------------------------------------------------
// 3. Carregamento do Modelo (Corrigido com URL estável)
// -----------------------------------------------------------------------------

const sceneModel = xktLoader.load({
    id: "myModel",
    // 🛑 USANDO URL PÚBLICA ESTÁVEL (Duplex) - Corrigindo problema de desaparecimento
    src: "https://xeokit.github.io/xeokit-sdk/assets/models/xkt/v10/ifc/Duplex.ifc.xkt", 
    edges: true,
    excludeUnclassifiedObjects: false,
    dtxEnabled: true 
});

// 🛑 Ação após o carregamento (Garantir que a câmera voe para o modelo)
sceneModel.on("loaded", () => {
    // Usa 'jumpTo' ou 'flyTo' para garantir que o modelo esteja na viewport
    viewer.cameraFlight.flyTo(sceneModel);
    console.log("Modelo carregado e câmera ajustada.");
});

// 🛑 Novo objeto para o plano de corte horizontal
horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
    id: "horizontalSectionPlane",
    dir: [0, -1, 0], // Inicialmente apontando para baixo
    pos: [0, 0, 0],
    active: false // Inicia inativo
});

// -----------------------------------------------------------------------------
// 4. Medições (Ângulo e Distância)
// -----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer);
const angleControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin);

const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer);
const distanceControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin);

let currentMode = "none"; // Inicia com o modo desativado

/**
 * Define o modo de medição ativo e gerencia os botões.
 * @param {string} mode - 'angle', 'distance' ou 'none'.
 * @param {HTMLElement} button - O botão clicado (ou null se for desativação programática).
 */
function setMeasurementMode(mode, button) {
    // Desativa todos os controles
    angleControl.reset();
    distanceControl.reset();
    angleMeasurementsPlugin.setConfigs({ active: false });
    distanceMeasurementsPlugin.setConfigs({ active: false });

    // Remove a classe 'active' de todos os botões
    document.querySelectorAll('#toolbar .tool-button').forEach(btn => {
        btn.classList.remove('active');
    });

    if (mode === "angle") {
        angleControl.reset(); // Zera o estado do controle de ângulo
        angleMeasurementsPlugin.setConfigs({ active: true });
        button.classList.add("active");
        currentMode = "angle";
        console.log("Modo: Ângulo ativado.");

    } else if (mode === "distance") {
        distanceControl.reset(); // Zera o estado do controle de distância
        distanceMeasurementsPlugin.setConfigs({ active: true });
        button.classList.add("active");
        currentMode = "distance";
        console.log("Modo: Distância ativado.");

    } else { // mode === "none" ou desativação
        // Se a desativação foi pelo botão, ele já foi desmarcado no loop acima
        currentMode = "none";
        console.log("Modo: Desativado.");
        // Opcional: Adiciona a classe 'active' ao botão 'Desativar' se ele foi clicado
        if (button && button.id === 'btnDeactivate') {
             button.classList.add("active");
        }
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

setupMeasurementEvents(angleMeasurementsPlugin);
setupMeasurementEvents(distanceMeasurementsPlugin);


// -----------------------------------------------------------------------------
// 6. Funções da Barra de Ferramentas (TreeView e SectionPlane)
// -----------------------------------------------------------------------------

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

// 🛑 EXPOR AO ESCOPO GLOBAL
window.toggleTreeView = toggleTreeView;

// Configuração do Isolamento/Zoom do TreeView
treeView.on("mouseClicked", (e) => {
    const entityId = e.entityId;

    if (entityId && sceneModel.getObjectsInSubtree(entityId).length > 0) {
        
        // Esconde todos os objetos, exceto o selecionado e sua subárvore
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


/**
 * Mostra todos os objetos e reseta o isolamento.
 */
function showAll() {
    // Reseta todos os estados de renderização
    viewer.scene.setObjectsVisible(viewer.scene.objects.getIDs(), true);
    viewer.scene.setObjectsXRayed(viewer.scene.objects.getIDs(), false);
    viewer.scene.setObjectsHighlighted(viewer.scene.objects.getIDs(), false);
    
    // Voa para a cena inteira
    viewer.cameraFlight.flyTo(viewer.scene);
    console.log("Modelo completo mostrado.");
}

// 🛑 EXPOR AO ESCOPO GLOBAL
window.showAll = showAll;

/**
 * Alterna o Plano de Corte Horizontal.
 * @param {HTMLElement} button - O botão clicado.
 */
function toggleSectionPlane(button) {
    
    // --- DESATIVAR ---
    if (horizontalSectionPlane.active) {
        horizontalSectionPlane.active = false;
        scene.sectionPlanes.active = false;

        // destrói o controle e remove listeners
        if (horizontalSectionPlane.control) {
            try {
                // Tenta remover o canvas do controle do input
                viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
            } catch (e) {
                console.error("Erro ao remover canvas do controle do plano de corte:", e);
            }
            horizontalSectionPlane.control.destroy();
            horizontalSectionPlane.control = null;
        }

        // Limpa elementos de canvas ativos (como o gizmo do plano de corte)
        if (viewer.input && viewer.input._activeCanvasElements) {
            viewer.input._activeCanvasElements.clear?.();
        }

        viewer.scene.render(); // força re-render
        button.classList.remove("active");
        viewer.cameraFlight.flyTo(scene); // Retorna a câmera para a cena completa
        return;
    }

    // --- ATIVAR ---
    // Garante que a cena tenha um AABB válido (se o modelo carregou)
    const aabb = scene.getAABB();
    if (aabb.every(val => val === Infinity || val === -Infinity || isNaN(val))) {
        console.error("Não foi possível ativar o plano de corte: AABB inválido.");
        return;
    }

    // Calcula a posição central (para centralizar o plano)
    const center = [(aabb[0] + aabb[3]) / 2, (aabb[1] + aabb[4]) / 2, (aabb[2] + aabb[5]) / 2];

    // Define a posição inicial no centro do modelo
    horizontalSectionPlane.pos = center;
    horizontalSectionPlane.dir = [0, -1, 0];
    horizontalSectionPlane.active = true;
    scene.sectionPlanes.active = true;

    // cria novamente o controle (gizmo)
    horizontalSectionPlane.control = sectionPlanesPlugin.showControl(horizontalSectionPlane.id);

    button.classList.add("active");
    viewer.scene.render(); // força re-render
    viewer.cameraFlight.flyTo(horizontalSectionPlane.control); // Voa para o gizmo do plano de corte
    console.log("Plano de corte ativado no centro do modelo.");
}

// 🛑 EXPOR AO ESCOPO GLOBAL
window.toggleSectionPlane = toggleSectionPlane;
