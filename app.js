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
    SectionPlanesPlugin, // Certifique-se de que o SectionPlanesPlugin está importado
    math 
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

let treeView; 
let modelIsolateController; 
let sectionPlanesPlugin; 
let horizontalSectionPlane = null; // MANTIDO: Inicializado como null. Será criado ao ativar.


// ----------------------------------------------------------------------------
// 1. Configuração do Viewer e Redimensionamento (100% da tela)
// ----------------------------------------------------------------------------

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
                    "right": "Direita"
                }
            }
        },
        locale: "pt" // Define o idioma padrão como Português
    })
});


function onWindowResize() {
    const canvas = viewer.scene.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', onWindowResize);
onWindowResize(); 

// ----------------------------------------------------------------------------
// 2. Carregamento dos Modelos e Ajuste da Câmera
// ----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

let modelsLoadedCount = 0;
const totalModels = 2; 

/**
 * Reseta a visibilidade, removendo isolamento e X-ray.
 */
function showAll() {
    if (modelIsolateController) {
        modelIsolateController.setObjectsVisible(modelIsolateController.getObjectsIds(), true);
        modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), false);
        modelIsolateController.setObjectsHighlighted(modelIsolateController.getObjectsIds(), false);
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
    // Garante que o corte seja desativado ao "Mostrar Tudo"
    if (horizontalSectionPlane) {
        horizontalSectionPlane.destroy(); 
        horizontalSectionPlane = null;
        viewer.scene.sectionPlanes.active = false;
        document.getElementById('btnSectionPlane')?.classList.remove('active');
    }
}
window.showAll = showAll; // expõe a função showAll

function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    if (modelsLoadedCount === totalModels) {
        viewer.cameraFlight.jumpTo(viewer.scene); 
        console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
        
        setMeasurementMode('none', document.getElementById('btnDeactivate')); 
        
        setupModelIsolateController();
        setupSectionPlane(); // Inicializa o plugin de corte
    }
}


// CARREGAMENTO DOS MODELOS
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


// ----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca
// ----------------------------------------------------------------------------

const angleMeasurementsPlugin = new AngleMeasurementsPlugin(viewer, { zIndex: 100000 });
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
angleMeasurementsMouseControl.deactivate(); 


const distanceMeasurementsPlugin = new DistanceMeasurementsPlugin(viewer, { zIndex: 100000 });
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurementsPlugin, {
    pointerLens: new PointerLens(viewer), 
    snapping: true 
});
distanceMeasurementsMouseControl.deactivate(); 

function setMeasurementMode(mode, clickedButton) {
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
    }

    angleMeasurementsMouseControl.reset(); 
    distanceMeasurementsMouseControl.reset(); 
}

window.setMeasurementMode = setMeasurementMode;

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
// 5. Cubo de Navegação (NavCube)
// ----------------------------------------------------------------------------

new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas", 
    visible: true,
    size: 150, 
    alignment: "bottomRight", 
    bottomMargin: 20, 
    rightMargin: 20 
});

// ----------------------------------------------------------------------------
// 6. TreeViewPlugin e Lógica de Isolamento
// ----------------------------------------------------------------------------

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
            // Se o usuário clicar em um nó que não contém objetos, mostra o modelo inteiro
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
        showAll(); // Ação de "Mostrar Tudo" ao fechar o painel
    } else {
        container.style.display = 'block';
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView; 


// ----------------------------------------------------------------------------
// 7. Plano de Corte (Section Plane) - CORREÇÃO FINAL
// ----------------------------------------------------------------------------

/**
 * Inicializa apenas o plugin. O plano em si será criado/destruído em toggleSectionPlane.
 */
function setupSectionPlane() {
    sectionPlanesPlugin = new SectionPlanesPlugin(viewer);
    
    // Garante que o sistema de corte esteja inativo no início
    viewer.scene.sectionPlanes.active = false; 
    console.log(`Plugin de corte inicializado.`);
}

/**
 * Alterna o estado do corte horizontal, destruindo/recriando o plano para remover o gizmo.
 */
function toggleSectionPlane(button) {
    const scene = viewer.scene;
    
    if (!sectionPlanesPlugin) {
        console.error("SectionPlanesPlugin não está inicializado.");
        return;
    }
    
    // --- 1. DESATIVAR (Plano existe) ---
    if (horizontalSectionPlane) {
        console.log("DESATIVANDO CORTE: Destruindo plano e gizmo.");
        
        // 🛑 Destrói o plano E seu controle (gizmo) associado
        horizontalSectionPlane.destroy(); 
        horizontalSectionPlane = null; // Zera a referência
        
        scene.sectionPlanes.active = false; // Desativa a renderização do corte
        
        button.classList.remove('active');
        // Volta para a vista completa usando o AABB da cena inteira
        viewer.cameraFlight.flyTo({
            aabb: viewer.scene.aabb, 
            duration: 0.5
        }); 
        
        return;
    } 

    // --- 2. ATIVAR (Plano não existe) ---
    console.log("ATIVANDO CORTE: Criando novo plano e gizmo.");

    // Calcula a AABB da cena para centralizar o corte
    const aabb = scene.getAABB(); 
    const modelHeight = aabb[4] - aabb[1]; 
    // Posição inicial: 2/3 da altura do modelo (para ver o interior)
    const initialCutY = aabb[1] + (modelHeight * 0.66); 

    // Cria um NOVO SectionPlane
    horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
        id: "horizontalPlane",
        // Posição centralizada em X/Z e na altura calculada (initialCutY)
        pos: [scene.center[0], initialCutY, scene.center[2]], 
        
        // Dir [0, 1, 0] aponta para cima, cortando o topo do modelo
        dir: [0, 1, 0],         
        active: true 
    });
    
    // Cria e mostra o controle (gizmo) para o NOVO SectionPlane.
    sectionPlanesPlugin.showControl(horizontalSectionPlane.id); 

    // Ativa o sistema de corte global
    scene.sectionPlanes.active = true; 

    // Atualiza o botão e a câmera
    button.classList.add('active');
    
    viewer.cameraFlight.flyTo({
        // Foca a câmera no centro do modelo, na altura do corte
        look: [scene.center[0], initialCutY, scene.center[2]],
        duration: 0.8
    });
}

window.toggleSectionPlane = toggleSectionPlane; // Expõe a função para o HTML
