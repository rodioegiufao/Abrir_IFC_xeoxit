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
    SectionPlanesPlugin 
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

// -----------------------------------------------------------------------------
// 2. Carregamento dos Modelos e Ajuste da Câmera
// -----------------------------------------------------------------------------

const xktLoader = new XKTLoaderPlugin(viewer);

let modelsLoadedCount = 0;
const totalModels = 2; 

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
        setTimeout(() => {
            viewer.cameraFlight.jumpTo(viewer.scene);
            console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
            setMeasurementMode('none', document.getElementById('btnDeactivate')); 
            setupModelIsolateController();
            // ❌ NÃO chamamos setupSectionPlane aqui
        }, 300);
    }
}

// CARREGAMENTO DOS MODELOS (MANTIDO)
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


// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca (MANTIDO)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Deletar Medição) (MANTIDO)
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
// 5. Cubo de Navegação (NavCube) (MANTIDO)
// -----------------------------------------------------------------------------

new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas", 
    visible: true,
    size: 150, 
    alignment: "bottomRight", 
    bottomMargin: 20, 
    rightMargin: 20 
});

// -----------------------------------------------------------------------------
// 6. TreeViewPlugin e Lógica de Isolamento (MANTIDO)
// -----------------------------------------------------------------------------

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


// -----------------------------------------------------------------------------
// 7. Plano de Corte (Section Plane) - VERSÃO ESTÁVEL
// -----------------------------------------------------------------------------

function setupSectionPlane() {
    sectionPlanesPlugin = new SectionPlanesPlugin(viewer);

    // 🔹 Desliga completamente o sistema de planos na inicialização
    viewer.scene.sectionPlanes.active = false;

    // Cria o plano horizontal (ainda inativo)
    horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
        id: "horizontalPlane",
        pos: [0, 0, 0],
        dir: [0, -1, 0],
        active: false
    });

    // 🔹 Não mostra controle ainda
    if (horizontalSectionPlane.control) {
        horizontalSectionPlane.control.visible = false;
    }

    console.log("Plano de corte inicializado (inativo)");

    // 🔹 Força uma atualização visual completa após o carregamento
    viewer.scene.on("tick", () => {
        // Assim que houver algo na cena, centraliza a câmera
        if (viewer.scene.numEntities > 0 && !setupSectionPlane._initialized) {
            setupSectionPlane._initialized = true;
            const aabb = viewer.scene.getAABB();
            viewer.cameraFlight.jumpTo({ aabb, duration: 0 });
            console.log("Câmera centralizada automaticamente após carregamento inicial.");
        }
    });
}

function toggleSectionPlane(button) {
    const scene = viewer.scene;

    // 🔹 Cria o plugin e o plano na primeira vez que o botão é clicado
    if (!horizontalSectionPlane) {
        sectionPlanesPlugin = new SectionPlanesPlugin(viewer);

        const aabb = scene.getAABB();
        const modelCenterY = (aabb[1] + aabb[4]) / 2;

        horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
            id: "horizontalPlane",
            pos: [0, modelCenterY, 0],
            dir: [0, -1, 0],
            active: false
        });

        if (horizontalSectionPlane.control) {
            horizontalSectionPlane.control.visible = false;
        }

        console.log("Plano de corte criado sob demanda.");
    }

    // 🔹 Alterna o estado
    if (horizontalSectionPlane.active) {
        // --- DESATIVAR ---
        horizontalSectionPlane.active = false;
        scene.sectionPlanes.active = false;

        // Esconde o widget de controle
        if (horizontalSectionPlane.control) {
            horizontalSectionPlane.control.visible = false;
        }

        // Também esconde qualquer controle visível criado pelo plugin
        if (sectionPlanesPlugin._sectionPlaneControl) {
            sectionPlanesPlugin._sectionPlaneControl.visible = false;
        }

        button.classList.remove('active');
        viewer.cameraFlight.flyTo(scene);

    } else {
        // --- ATIVAR ---
        const aabb = scene.getAABB();
        const modelCenterY = (aabb[1] + aabb[4]) / 2;

        horizontalSectionPlane.pos = [0, modelCenterY, 0];
        horizontalSectionPlane.dir = [0, -1, 0];
        horizontalSectionPlane.active = true;
        scene.sectionPlanes.active = true;

        // Mostra o controle (arcos e setas)
        if (horizontalSectionPlane.control) {
            horizontalSectionPlane.control.visible = true;
        } else {
            sectionPlanesPlugin.showControl(horizontalSectionPlane.id);
        }

        button.classList.add('active');

        viewer.cameraFlight.flyTo({
            aabb: scene.aabb,
            duration: 0.5
        });
    }
}

window.toggleSectionPlane = toggleSectionPlane;





