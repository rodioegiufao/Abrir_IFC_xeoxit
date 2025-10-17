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
let horizontalPlaneControl; 
let lastPickedEntity = null; // Entidade selecionada por duplo-clique (highlight)

// Variável para armazenar a entidade clicada com o botão direito (contextMenu)
let rightClickedEntity = null; 

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

/**
 * Reseta a visibilidade de todos os objetos e remove qualquer destaque ou raio-x.
 */
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
    lastPickedEntity = null; 
    clearSelection(false); 
}


function adjustCameraOnLoad() {
    modelsLoadedCount++;
    
    if (modelsLoadedCount === totalModels) {
        setTimeout(() => {
            viewer.cameraFlight.jumpTo(viewer.scene);
            console.log("Todos os modelos carregados e câmera ajustada para o zoom correto.");
            setMeasurementMode('none', document.getElementById('btnDeactivate')); 
            setupModelIsolateController();
            
            // CHAMADA ESSENCIAL: Configura as interações de mouse após o carregamento.
            setupUserInteractions();
            
        }, 300);
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


// -----------------------------------------------------------------------------
// 3. Plugins de Medição e Função de Troca
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
    
    // Garante que o modo de seleção seja desativado ao iniciar uma medição
    clearSelection(); 
}

window.setMeasurementMode = setMeasurementMode;

// -----------------------------------------------------------------------------
// 4. Menu de Contexto (Definição e Lógica)
// -----------------------------------------------------------------------------

/**
 * Formata e exibe as propriedades do Material da entidade.
 */
function showEntityProperties(entity) {
    if (!entity) return;

    // Acesso à MetaScene para obter os metadados
    const metaModel = viewer.scene.metaScene.getMetaModel(entity.modelId);

    if (!metaModel) {
        alert("Metadados não encontrados para o modelo.");
        return;
    }

    const metaObject = metaModel.getMetaObject(entity.id);

    if (!metaObject) {
        alert(`Metadados não encontrados para o objeto ${entity.id}.`);
        return;
    }

    let propertiesText = `--- Propriedades de ${metaObject.name} (${metaObject.type}) ---\n\n`;

    const propertySets = metaObject.propertySets;
    let materialProperties = [];
    
    if (propertySets && propertySets.length > 0) {
        
        let foundMaterial = false;

        // Tenta encontrar o PropertySet específico de Material
        for (const ps of propertySets) {
            if (ps.name === 'Material' || ps.name === 'Materiais' || ps.name === 'Pset_Material') { 
                materialProperties = ps.properties;
                foundMaterial = true;
                propertiesText += `Propriedades do Conjunto: ${ps.name}\n`;
                break;
            }
        }
        
        // Fallback: Se não encontrar "Material", usa o primeiro PropertySet
        if (!foundMaterial && propertySets[0].properties) {
            propertiesText += `Propriedades Gerais (Conjunto: ${propertySets[0].name})\n`;
            materialProperties = propertySets[0].properties;
        } else if (!foundMaterial) {
             propertiesText += `Nenhum PropertySet com propriedades encontrado.\n`;
        }
        
        // 2. Formata e lista as propriedades
        if (materialProperties.length > 0) {
            materialProperties.forEach(prop => {
                // Adiciona a unidade se existir
                const unit = prop.unit ? ` (${prop.unit})` : '';
                propertiesText += `- ${prop.name}: ${prop.value}${unit}\n`;
            });
        }
        
    } else if (metaObject.properties && metaObject.properties.length > 0) {
         // Fallback para propriedades de nível de objeto simples
        propertiesText += `Propriedades de Nível de Objeto:\n`;
        metaObject.properties.forEach(prop => {
            const unit = prop.unit ? ` (${prop.unit})` : '';
            propertiesText += `- ${prop.name}: ${prop.value}${unit}\n`;
        });
    } else {
        propertiesText += "Nenhum dado de propriedade disponível.";
    }

    // 3. Exibe o resultado formatado (usando alert por simplicidade)
    alert(propertiesText);
    console.log("Propriedades da Entidade:", propertiesText); 
}

// Definição do Menu de Contexto
const contextMenu = new ContextMenu({
    items: [
        [
            {
                // ITEM: Propriedades
                title: "Propriedades",
                doAction: function (context) {
                    showEntityProperties(rightClickedEntity);
                },
                // Habilita/desabilita se uma entidade foi rastreada pelo botão direito
                getEnabled: function(context) {
                    return !!rightClickedEntity;
                }
            },
            {
                title: "Deletar Medição",
                doAction: function (context) {
                    if (context.measurement) {
                        context.measurement.destroy();
                    }
                },
                // Habilita/desabilita se o clique foi em uma medição
                 getEnabled: function(context) {
                    return !!context.measurement;
                }
            }
        ]
    ]
});


// Listener para o clique com o botão direito nas Medições
function setupMeasurementEvents(plugin) {
    plugin.on("contextMenu", (e) => {
        const measurement = e.angleMeasurement || e.distanceMeasurement;
        contextMenu.context = { measurement: measurement };
        rightClickedEntity = null; // Zera a entidade para focar na medição
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
// 5. Cubo de Navegação (NavCube)
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
// 6. TreeViewPlugin e Lógica de Isolamento
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
        
        if (entityId && viewer.scene.getObjectsInSubtree(entityId).length > 0) {
            
            const subtreeIds = viewer.scene.getObjectsInSubtree(entityId);
            
            modelIsolateController.setObjectsXRayed(modelIsolateController.getObjectsIds(), true); 
            modelIsolateController.setObjectsXRayed(subtreeIds, false); 

            modelIsolateController.isolate(subtreeIds); 
            
            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entityId),
                duration: 0.5
            });
            
            clearSelection(); 

        } else {
            resetModelVisibility(); 
        }
    });
}

function toggleTreeView() {
    const container = document.getElementById('treeViewContainer');
    
    if (container.style.display === 'block') {
        container.style.display = 'none';
        resetModelVisibility(); 
    } else {
        container.style.display = 'block';
    }
}

// EXPOR AO ESCOPO GLOBAL para ser chamado pelo 'onclick' do HTML
window.toggleTreeView = toggleTreeView;
window.resetModelVisibility = resetModelVisibility; 

// -----------------------------------------------------------------------------
// 7. Plano de Corte (Section Plane)
// -----------------------------------------------------------------------------

function toggleSectionPlane(button) {
    const scene = viewer.scene;

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

        console.log("Plano de corte criado sob demanda.");
    }

    // --- DESATIVAR ---
    if (horizontalSectionPlane.active) {
        horizontalSectionPlane.active = false;
        scene.sectionPlanes.active = false;

        if (horizontalSectionPlane.control) {
            try {
                viewer.input.removeCanvasElement(horizontalSectionPlane.control.canvas);
            } catch (e) {}
            horizontalSectionPlane.control.destroy();
            horizontalSectionPlane.control = null;
        }

        if (viewer.input && viewer.input._activeCanvasElements) {
            viewer.input._activeCanvasElements.clear?.();
        }

        viewer.scene.render(); 
        button.classList.remove("active");
        viewer.cameraFlight.flyTo(scene);
        return;
    }

    // --- ATIVAR ---
    const aabb = scene.getAABB();
    const modelCenterY = (aabb[1] + aabb[4]) / 2;

    horizontalSectionPlane.pos = [0, modelCenterY, 0];
    horizontalSectionPlane.dir = [0, -1, 0];
    horizontalSectionPlane.active = true;
    scene.sectionPlanes.active = true;

    horizontalSectionPlane.control = sectionPlanesPlugin.showControl(horizontalSectionPlane.id);

    button.classList.add("active");

    viewer.cameraFlight.flyTo({
        aabb: scene.aabb,
        duration: 0.5
    });
}

window.toggleSectionPlane = toggleSectionPlane;

// -----------------------------------------------------------------------------
// 8. Seleção de Entidade e ContextMenu (Garantindo a ordem de inicialização)
// -----------------------------------------------------------------------------

/**
 * Limpa a seleção atual (destaque).
 */
function clearSelection(log = true) {
    if (lastPickedEntity) {
        lastPickedEntity.highlighted = false;
        lastPickedEntity = null;
    }
    const btnClearSelection = document.getElementById('btnClearSelection');
    if (btnClearSelection) {
        btnClearSelection.classList.remove('active');
    }
    if (log) {
        console.log("Seleção limpa.");
    }
}

window.clearSelection = clearSelection; 


/**
 * CONFIGURAÇÃO DOS LISTENERS DE INTERAÇÃO DO USUÁRIO.
 * Esta função só é chamada após o carregamento dos modelos em adjustCameraOnLoad().
 */
function setupUserInteractions() {

    // Listener do Duplo-Clique (Duplo-clique para Seleção/Zoom)
    viewer.cameraControl.on("doublePicked", pickResult => {

        clearSelection(false); 

        if (pickResult.entity) {
            const entity = pickResult.entity;

            entity.highlighted = true;
            lastPickedEntity = entity; 

            viewer.cameraFlight.flyTo({
                aabb: viewer.scene.getAABB(entity.id),
                duration: 0.5
            });

            console.log(`Entidade selecionada por duplo-clique: ${entity.id}`);
            
            const btnClearSelection = document.getElementById('btnClearSelection');
            if (btnClearSelection) {
                btnClearSelection.classList.add('active');
            }

        } else {
            console.log("Duplo-clique no vazio.");
        }
    });


    // Listener do ContextMenu (Botão direito)
    viewer.input.on("contextMenu", (e) => {
        
        // 1. Limpa o contexto de medição
        contextMenu.context = {}; 

        // 2. Tenta pegar a entidade na posição do clique
        viewer.scene.pick({ 
            canvasPos: e.canvasPos, 
            pickSurface: true 
        }, (pickResult) => {
            if (pickResult.entity) {
                // Se encontrou uma entidade, armazena para o menu de contexto
                rightClickedEntity = pickResult.entity;
                console.log(`Entidade rastreada por botão direito: ${rightClickedEntity.id}`);
            } else {
                // Se clicou no vazio, não há entidade para propriedades
                rightClickedEntity = null;
            }
            
            // 3. Mostra o menu de contexto
            contextMenu.show(e.event.clientX, e.event.clientY);
        });
        
        // Previne o menu de contexto nativo do navegador
        e.event.preventDefault(); 
    });
}
