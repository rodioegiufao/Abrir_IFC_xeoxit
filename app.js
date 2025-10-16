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
    ModelIsolateController // 🛑 CORREÇÃO: Importa a classe ModelIsolateController
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

// Variáveis globais para os plugins
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
                    "frontTopLeft": "Frente-Topo-Esquerda",
                    "frontTopRight": "Frente-Topo-Direita",
                    "backTopLeft": "Trás-Topo-Esquerda",
                    "backTopRight": "Trás-Topo-Direita",
                    "frontBottomLeft": "Frente-Baixo-Esquerda",
                    "frontBottomRight": "Frente-Baixo-Direita",
                    "backBottomLeft": "Trás-Baixo-Esquerda",
                    "backBottomRight": "Trás-Baixo-Direita"
                }
            }
        },
        locale: "pt" // Define o idioma padrão como Português
    })
});

// Garante que o viewer se ajuste às dimensões da janela
function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); // Chama na inicialização


// -----------------------------------------------------------------------------
// 2. Plugins e Controles de Interação
// -----------------------------------------------------------------------------

// 🛑 NOVA INSTANCIAÇÃO: Inicializa o ModelIsolateController 
modelIsolateController = new ModelIsolateController(viewer);

// Adiciona o Cube de Navegação
new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas",
    visible: true,
    size: 150,
    alignment: "bottomRight",
    bottomMargin: 20,
    rightMargin: 20
});

// Adiciona o plugin de medição de ângulo
const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer);

// Adiciona o plugin de medição de distância
const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer);

// Inicializa os controles de mouse para medição
const angleControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin);
const distanceControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin);

// Inicializa o PointerLens (ajuda a mirar)
new PointerLens(viewer);

// Inicializa o plugin de planos de corte
sectionPlanesPlugin = new SectionPlanesPlugin(viewer);

// Cria um SectionPlane para ser usado pelo botão de corte
horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
    id: "horizontalSectionPlane",
    dir: [0, -1, 0], // Inicia apontando para baixo (corte horizontal)
    active: false
});

// Inicializa o TreeViewPlugin
treeView = new TreeViewPlugin(viewer, {
    containerElement: document.getElementById("treeViewContainer"),
    autoExpandDepth: 1, // Expande apenas o primeiro nível ao carregar
    hierarchy: "containment" // Mostra a estrutura por níveis (andar, sala, etc)
});

// Adiciona listener para o clique na TreeView para isolar o objeto/sub-estrutura
setupTreeViewEvents();

// -----------------------------------------------------------------------------
// 3. Funções de Controle (Toolbar)
// -----------------------------------------------------------------------------

/**
 * Alterna o modo de medição ativo e o estilo do botão.
 * @param {string} mode 'angle', 'distance', ou 'none'
 * @param {HTMLElement} button O botão que foi clicado.
 */
function setMeasurementMode(mode, button) {
    const buttons = document.querySelectorAll('#toolbar .tool-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Desativa ambos os controles
    angleControl.active = false;
    distanceControl.active = false;

    if (mode === 'angle') {
        angleControl.active = true;
        button.classList.add('active');
    } else if (mode === 'distance') {
        distanceControl.active = true;
        button.classList.add('active');
    }

    // Se o modo for 'none', o botão de desativar (ou o último ativo) pode ser mantido, mas o controle é resetado.
    if (mode === 'none') {
        // Limpa todas as medições e controles, mas não ativa nenhum modo
        angleMeasurementsPlugin.clear();
        distanceMeasurementsPlugin.clear();
        angleControl.reset();
        distanceControl.reset(); 
        
        // Ativa o botão de desativar (se foi ele que chamou)
        if (button?.id === 'btnDeactivate') { // Adicionei '?' para segurança, caso o parâmetro button não venha
            button.classList.add('active');
        }
    }
}

/**
 * Alterna o plano de corte horizontal.
 * @param {HTMLElement} button O botão de corte.
 */
function toggleSectionPlane(button) {
    const scene = viewer.scene;

    // --- DESATIVAR ---
    if (horizontalSectionPlane.active) {
        horizontalSectionPlane.active = false;
        scene.sectionPlanes.active = false;

        // destrói o controle (gizmo), remove listeners e força redraw
        if (horizontalSectionPlane.control) {
            try {
                // Tenta remover o canvas do controle (gizmo) do input
                viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
            } catch (e) {} // Ignora erro se o canvas já foi removido
            horizontalSectionPlane.control.destroy();
            horizontalSectionPlane.control = null;
        }

        // alguns builds deixam o gizmo em viewer.input._activeCanvasElements
        // Limpa o cache de elementos ativos para garantir que o gizmo desapareça
        if (viewer.input && viewer.input._activeCanvasElements) {
            viewer.input._activeCanvasElements.clear?.();
        }

        viewer.scene.render(); // força re-render
        button.classList.remove("active");
        viewer.cameraFlight.flyTo(scene); // Retorna a câmera para a vista geral
        return;
    }

    // --- ATIVAR ---\
    const aabb = scene.getAABB();
    // Posição Y no centro do AABB (caixa delimitadora)
    const modelCenterY = (aabb[1] + aabb[4]) / 2;

    horizontalSectionPlane.pos = [0, modelCenterY, 0]; // Define a posição Y no centro
    horizontalSectionPlane.dir = [0, -1, 0]; // Garante que o corte é horizontal
    horizontalSectionPlane.active = true;
    scene.sectionPlanes.active = true; // Ativa o plugin

    // cria novamente o controle (gizmo)
    horizontalSectionPlane.control = sectionPlanesPlugin.showControl(horizontalSectionPlane.id);

    button.classList.add("active");
    viewer.cameraFlight.flyTo(horizontalSectionPlane.control.getAABB()); // Voa para o plano de corte

    // Garante que o botão de desativar medição não esteja ativo
    document.getElementById('btnAngle').classList.remove('active');
    document.getElementById('btnDistance').classList.remove('active');
    document.getElementById('btnDeactivate').classList.remove('active');
}


/**
 * Alterna a visibilidade do contêiner do TreeView.
 */
function toggleTreeView() {
    const container = document.getElementById('treeViewContainer');
    const button = document.getElementById('btnToggleTree');

    if (container.style.display === 'block') {
        container.style.display = 'none';
        button.classList.remove('active');
    } else {
        container.style.display = 'block';
        button.classList.add('active');
    }
}

/**
 * Mostra todos os objetos e reseta o isolamento.
 */
function showAll() {
    if (modelIsolateController) {
        // Reseta todos os estados visuais para o modelo inteiro
        modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), true);
        modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false);
        modelIsolateController.setObjectsHighlighted(modelIsolateController.getObjectsIds(), false);
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
    // Garante que todos os botões de modo (incluindo o próprio 'showAll') estejam desativados
    document.querySelectorAll('#toolbar .tool-button').forEach(btn => btn.classList.remove('active'));
    
    // Força o modo 'none' para medição, limpando as medições ativas
    setMeasurementMode('none'); 
}


// 🛑 EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.setMeasurementMode = setMeasurementMode;
window.toggleTreeView = toggleTreeView;
window.showAll = showAll;
window.toggleSectionPlane = toggleSectionPlane;


// ----------------------------------------------------------------------------
// 4. Menu de Contexto (Deletar Medição)
// ----------------------------------------------------------------------------

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


// ----------------------------------------------------------------------------
// 5. Carregamento do Modelo
// ----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

xktLoader.load({
    id: "myModel",
    src: "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/assets/models/xkt/v10/ifc/Schependomlaan.ifc.xkt",
    edges: true,
    excludeUnclassifiedObjects: false
});

// ----------------------------------------------------------------------------
// 6. Eventos da Árvore de Estrutura (TreeView)
// ----------------------------------------------------------------------------

function setupTreeViewEvents() {
    treeView.on("objectClicked", (e) => {

        const entityId = e.entityId;

        if (entityId) {
            
            // Oculta o modelo inteiro primeiro
            modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), false); 

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
