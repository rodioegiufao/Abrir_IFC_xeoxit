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
    LineSet,         
    buildGridGeometry,
    TransformControl // <--- NOVO: Importa TransformControl
} from "https://cdn.jsdelivr.net/npm/@xeokit/xeokit-sdk@latest/dist/xeokit-sdk.min.es.js"; 

let treeView; 
let modelIsolateController; 
let sectionPlanesPlugin; 
let horizontalSectionPlane; 
let horizontalPlaneControl; 
let lastPickedEntity = null;
let transformControl; // <--- NOVO: Variável para o controle de transformação

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
            // Mensagens para o NavCube
            "navCube.front": "Frente",
            "navCube.back": "Trás",
            "navCube.left": "Esquerda",
            "navCube.right": "Direita",
            "navCube.top": "Topo",
            "navCube.bottom": "Base"
        }
    })
});

// NOVO: Inicialização do TransformControl
transformControl = new TransformControl(viewer);
transformControl.visible = false;
transformControl.setTranslateEnabled(true); // Habilita mover
transformControl.setRotateEnabled(true);    // Habilita rodar
transformControl.setScaleEnabled(false);    // Desabilita escala, se necessário

function onWindowResize() {
    viewer.resize();
    if (horizontalPlaneControl) {
        horizontalPlaneControl.resize(); // Se a interface do plano de corte estiver ativa
    }
}

window.addEventListener("resize", onWindowResize);

// -----------------------------------------------------------------------------
// 2. Controladores e Plugins - Funções e Inicialização
// -----------------------------------------------------------------------------

// Plugin para carregar modelos XKT
const xktLoader = new XKTLoaderPlugin(viewer);

// Plugin para o NavCube
const navCube = new NavCubePlugin(viewer, {
    canvasId: "myNavCubeCanvas",
    visible: true,
    size: 150
});

// Plugins e controles de medição
const angleMeasurements = new AngleMeasurementsPlugin(viewer);
const angleMeasurementsMouseControl = new AngleMeasurementsMouseControl(angleMeasurements, {
    pointerLens : new PointerLens(viewer)
});
angleMeasurementsMouseControl.snapping = true;

const distanceMeasurements = new DistanceMeasurementsPlugin(viewer);
const distanceMeasurementsMouseControl = new DistanceMeasurementsMouseControl(distanceMeasurements, {
    pointerLens : new PointerLens(viewer)
});
distanceMeasurementsMouseControl.snapping = true;

// Plugin de Plano de Corte
sectionPlanesPlugin = new SectionPlanesPlugin(viewer);
horizontalSectionPlane = sectionPlanesPlugin.createSectionPlane({
    pos: [0, 0, 0],
    dir: [0, -1, 0] // Corte horizontal, olhando para baixo
});

horizontalPlaneControl = horizontalSectionPlane.createControl({
    // Cria um UI para o plano de corte (desativado por padrão)
});
horizontalPlaneControl.setVisible(false);


// Plugin para a Árvore de Estrutura
treeView = new TreeViewPlugin(viewer, {
    containerElement: document.getElementById("treeViewContainer"),
    enableContextMenu: false // Desabilita o menu de contexto padrão
});
// Esconde a árvore por padrão
document.getElementById("treeViewContainer").style.display = 'none';

/**
 * Reseta a visibilidade de todos os objetos e remove o isolamento.
 */
function resetModelVisibility() {
    if (viewer.scene.models['meu_modelo']) {
        viewer.scene.models['meu_modelo'].visible = true;
    }
    if (viewer.scene.models['modelo-02']) {
        viewer.scene.models['modelo-02'].visible = true;
    }

    if (modelIsolateController) {
        viewer.scene.setObjectsVisible(viewer.scene.objectIds, true);
        viewer.scene.setObjectsXRayed(viewer.scene.objectIds, false);
        viewer.scene.setObjectsHighlighted(viewer.scene.objectIds, false);
        // Centraliza a câmera no modelo inteiro
        viewer.cameraFlight.jumpTo(viewer.scene);
    }
    
    // NOVO: Limpa o TransformControl
    if (transformControl) { 
        transformControl.setTarget(null);
        transformControl.setVisible(false);
        viewer.cameraControl.active = true; // Reativa o controle da câmera
    }

    lastPickedEntity = null; // Garante que a referência de seleção também seja limpa.
    clearSelection(false); // Limpa o estado visual do botão "Limpar Seleção"
}

// -----------------------------------------------------------------------------
// 3. Funções de Utilidade (Seleção, Medição, Grade)
// -----------------------------------------------------------------------------

/**
 * Limpa a seleção e o destaque de todos os objetos.
 * @param {boolean} [removeButtonHighlight=true] Se deve remover o destaque dos botões da toolbar.
 */
function clearSelection(removeButtonHighlight = true) {
    try {
        angleMeasurements.clear();
        distanceMeasurements.clear();
        viewer.scene.setObjectsHighlighted(viewer.scene.highlightedObjectIds, false);
        viewer.scene.setObjectsSelected(viewer.scene.selectedObjectIds, false);
        viewer.scene.setObjectsXRayed(viewer.scene.xrayedObjectIds, false);

        // NOVO: Limpa o TransformControl ao limpar a seleção
        if (transformControl && transformControl.target) {
            transformControl.setTarget(null);
            transformControl.setVisible(false);
            viewer.cameraControl.active = true;
        }

        // Opcionalmente remove destaque do botão ativo
        if (removeButtonHighlight) {
            document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
        }
    } catch (e) {
        console.warn("⚠️ clearSelection(): falhou ao limpar seleção:", e);
    }
}

/**
 * Define o modo de medição e atualiza o estado dos botões.
 * @param {'angle'|'distance'|'none'} mode 
 * @param {HTMLElement} [button=null] O botão clicado, para destacar.
 */
function setMeasurementMode(mode, button = null) {
    clearSelection(false); // Não remove o destaque dos botões

    // Desativa todos os controles de medição e de câmera (se TransformControl estiver ativo)
    angleMeasurementsMouseControl.deactivate();
    distanceMeasurementsMouseControl.deactivate();
    if (transformControl.target === null) {
        viewer.cameraControl.active = true;
    }

    // Remove destaque de todos os botões de medição
    document.querySelectorAll('.tool-button-measurement').forEach(btn => btn.classList.remove('active'));

    switch (mode) {
        case 'angle':
            angleMeasurementsMouseControl.activate();
            if (button) button.classList.add('active');
            console.log("Modo: Medição de Ângulo Ativado.");
            break;
        case 'distance':
            distanceMeasurementsMouseControl.activate();
            if (button) button.classList.add('active');
            console.log("Modo: Medição de Distância Ativada.");
            break;
        case 'none':
            console.log("Modo: Desativado.");
            // O botão 'Desativar' já está ativo, então não precisa adicionar classe.
            break;
    }
}

/**
 * Alterna a visibilidade da TreeView.
 */
function toggleTreeView() {
    const container = document.getElementById("treeViewContainer");
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
    
    // Altera o estado do botão
    document.getElementById('btnToggleTree').classList.toggle('active', !isVisible);

    // Ajusta o NavCube para não sobrepor
    const navCubeCanvas = document.getElementById("myNavCubeCanvas");
    if (!isVisible) {
        navCubeCanvas.style.right = '20px';
    } else {
        navCubeCanvas.style.right = '320px'; // Move o NavCube para a esquerda da TreeView
    }
}

/**
 * Cria a grade de fundo.
 */
let gridLineSet = null;
function createGrid() {
    const halfSize = 200;
    const spacing = 10;
    const numLines = halfSize / spacing;
    const size = halfSize * 2;
    const color = [0.8, 0.8, 0.8];

    const gridGeometry = buildGridGeometry(size, numLines, color);

    gridLineSet = new LineSet(viewer.scene, {
        id: "myGrid",
        geometry: gridGeometry,
        matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Matriz identidade (sem transformação inicial)
        visible: true // Inicia visível
    });
}
createGrid(); // Chama para criar a grade ao iniciar

/**
 * Alterna a visibilidade da Grade no Solo.
 */
function toggleGrid() {
    if (gridLineSet) {
        gridLineSet.visible = !gridLineSet.visible;
        document.getElementById('btnGrid').classList.toggle('active', gridLineSet.visible);
    }
}

/**
 * Alterna a visibilidade do Plano de Corte e seu controle.
 * @param {HTMLElement} button O botão clicado, para destacar.
 */
function toggleSectionPlane(button) {
    const isVisible = horizontalSectionPlane.active;
    horizontalSectionPlane.active = !isVisible;
    horizontalPlaneControl.setVisible(!isVisible);

    button.classList.toggle('active', !isVisible);

    if (isVisible) {
        console.log("Plano de Corte desativado.");
    } else {
        // Centraliza o controle no centro do modelo (AABB)
        const aabb = viewer.scene.aabb;
        const center = [(aabb[0] + aabb[3]) / 2, (aabb[1] + aabb[4]) / 2, (aabb[2] + aabb[5]) / 2];
        horizontalSectionPlane.pos = center; // Move o plano para o centro
        horizontalPlaneControl.resize(); // Ajusta o UI do controle
        console.log("Plano de Corte ativado e centralizado.");
    }
}

/**
 * Alterna o TransformControl no objeto (Entity) fornecido.
 * Se o controle já estiver ativo neste objeto, ele é desativado.
 */
function toggleObjectManipulation(entity) {
    // 1. Se o controle já estiver ativo no objeto, desativa
    if (transformControl.target === entity) {
        transformControl.setTarget(null);
        transformControl.setVisible(false);
        viewer.cameraControl.active = true; // Reativa o controle de câmera
        entity.highlighted = false; // Remove destaque
        console.log("Manipulação de objeto desativada.");
        return;
    }

    // 2. Limpa seleções visuais e desativa medições
    clearSelection(true); 
    setMeasurementMode('none');

    // 3. Define o objeto como alvo
    transformControl.setTarget(entity);
    transformControl.setVisible(true);
    
    // 4. Define os manipuladores para atualizar a entidade ao mover/rodar
    transformControl.setHandlers({
        onPosition: (position) => {
            entity.position = position;
        },
        onQuaternion: (quaternion) => {
            // Permite rotação
            entity.quaternion = quaternion;
        }
    });

    // 5. Desativa o controle da câmera para que o TransformControl funcione
    viewer.cameraControl.active = false; 

    // 6. Destaca o objeto sendo manipulado
    entity.highlighted = true;

    console.log(`Manipulação de objeto ativada para: ${entity.id}`);
}


// -----------------------------------------------------------------------------
// 4. Carregamento dos Modelos
// -----------------------------------------------------------------------------

xktLoader.load({
    id: "meu_modelo",
    src: "assets/meu_modelo.xkt",
    edges: true,
    saoBias: 0.1,
    saoScale: 1
}).then(model => {
    console.log("Modelo 'meu_modelo.xkt' carregado com sucesso!");
    viewer.cameraFlight.jumpTo(viewer.scene);
    // treeView.modelId = "meu_modelo"; // Descomentar se quiser que a TreeView exiba apenas este modelo

}).catch(error => {
    console.error("Erro ao carregar 'meu_modelo.xkt':", error);
});

xktLoader.load({
    id: "modelo-02",
    src: "assets/modelo-02.xkt",
    edges: true,
    saoBias: 0.1,
    saoScale: 1,
    position: [10, 0, 0], // Exemplo de mover o segundo modelo para não sobrepor
}).then(model => {
    console.log("Modelo 'modelo-02.xkt' carregado com sucesso!");
}).catch(error => {
    console.error("Erro ao carregar 'modelo-02.xkt':", error);
});


// -----------------------------------------------------------------------------
// 5. Configuração da Câmera (Inicial)
// -----------------------------------------------------------------------------

viewer.camera.eye = [-10, 10, 10];
viewer.camera.look = [0, 0, 0];
viewer.camera.up = [0, 1, 0];

// -----------------------------------------------------------------------------
// 6. Configurações Globais de Exportação para o HTML
// -----------------------------------------------------------------------------

window.setMeasurementMode = setMeasurementMode;
window.resetModelVisibility = resetModelVisibility;
window.clearSelection = clearSelection;
window.toggleTreeView = toggleTreeView;
window.toggleGrid = toggleGrid;
window.toggleSectionPlane = toggleSectionPlane;


// -----------------------------------------------------------------------------
// 7. Manipulação de Eventos do Teclado (Para desativar a manipulação)
// -----------------------------------------------------------------------------

document.addEventListener('keydown', (event) => {
    // Tecla ESC
    if (event.key === 'Escape') { 
        clearSelection(); 
        setMeasurementMode('none');
        resetModelVisibility();
        // Desativa explicitamente o TransformControl se estiver ativo
        if (transformControl.target) {
            transformControl.setTarget(null);
            transformControl.setVisible(false);
            viewer.cameraControl.active = true;
        }
    }
});

// -----------------------------------------------------------------------------
// 8. Eventos de Mouse (Seleção/Destaque)
// -----------------------------------------------------------------------------

viewer.cameraControl.on("picked", (e) => {
    if (e.entity && e.entity.isObject) {
        if (lastPickedEntity && lastPickedEntity !== e.entity) {
            lastPickedEntity.highlighted = false;
        }
        e.entity.highlighted = true;
        lastPickedEntity = e.entity;
    } else {
        if (lastPickedEntity) {
            lastPickedEntity.highlighted = false;
            lastPickedEntity = null;
        }
    }
});

// -----------------------------------------------------------------------------
// 9. Menu de Contexto ao Clicar no Objeto (materialContextMenu)
// -----------------------------------------------------------------------------
const materialContextMenu = new ContextMenu({
    items: [
        [ // Seção 1: Cor/Visibilidade
            {
                title: "Ocultar Objeto",
                getEnabled: (context) => context.entity.visible,
                doAction: (context) => {
                    context.entity.visible = false;
                    materialContextMenu.hide();
                }
            },
            {
                title: "Alterar Cor (Vermelho)",
                doAction: (context) => {
                    context.entity.colorize = [1.0, 0.0, 0.0];
                    materialContextMenu.hide();
                }
            },
            {
                title: "Resetar Cor/Visibilidade",
                doAction: (context) => {
                    context.entity.visible = true;
                    context.entity.colorize = null;
                    materialContextMenu.hide();
                }
            }
        ],
        [ // Seção 2: Isolamento/X-Ray
            {
                title: "Isolar Objeto",
                doAction: (context) => {
                    const scene = context.viewer.scene;
                    const entity = context.entity;
                    const metaObject = viewer.metaScene.metaObjects[entity.id];
                    if (!metaObject) return;
                    scene.setObjectsVisible(scene.objectIds, false);
                    metaObject.withMetaObjectsInSubtree((mo) => {
                        const e = scene.objects[mo.id];
                        if (e) e.visible = true;
                    });
                    materialContextMenu.hide();
                }
            },
            {
                title: "X-Ray em Outros",
                doAction: (context) => {
                    const scene = context.viewer.scene;
                    const entity = context.entity;
                    const metaObject = viewer.metaScene.metaObjects[entity.id];
                    if (!metaObject) return;
                    scene.setObjectsVisible(scene.objectIds, true);
                    scene.setObjectsXRayed(scene.objectIds, true);
                    metaObject.withMetaObjectsInSubtree((mo) => {
                        const e = scene.objects[mo.id];
                        if (e) e.xrayed = false;
                    });
                    materialContextMenu.hide();
                }
            },
            {
                title: "Redefinir X-Ray",
                getEnabled: (context) => context.viewer.scene.numXRayedObjects > 0,
                doAction: (context) => {
                    context.viewer.scene.setObjectsXRayed(context.viewer.scene.xrayedObjectIds, false);
                    materialContextMenu.hide();
                }
            }
        ],
        // NOVO: SEÇÃO DE MANIPULAÇÃO DO OBJETO
        [
            {
                // Título dinâmico: mostra "Parar Manipulação" se ativo, ou "Manipular Objeto" se inativo
                getTitle: (context) => {
                    const entity = context.entity;
                    // Verifica se o TransformControl está ativo e mirando nesta entidade
                    if (transformControl && transformControl.target === entity) {
                        return "🛑 Parar Manipulação";
                    }
                    return "👆 Manipular Objeto (Mover/Rodar)";
                },
                // Habilitado se a entidade existir e for um objeto
                getEnabled: (context) => context.entity && context.entity.isObject,
                doAction: (context) => {
                    // Chama a nova função
                    toggleObjectManipulation(context.entity);
                    // Oculta o menu de contexto
                    materialContextMenu.hide();
                }
            }
        ]
    ]
});

// Captura o evento de clique direito no canvas
viewer.scene.canvas.canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Impede o menu de contexto padrão do navegador

    const canvasPos = [event.pageX, event.pageY];
    const hit = viewer.scene.pick({ canvasPos });

    if (hit && hit.entity && hit.entity.isObject) {
        // Objeto clicado: mostra o menu personalizado
        materialContextMenu.context = { viewer, entity: hit.entity };
        materialContextMenu.show(event.pageX, event.pageY);
    } else {
        // Nada clicado: esconde o menu
        materialContextMenu.hide();
    }
});

// Esconde o menu de contexto ao clicar em qualquer lugar
document.addEventListener('mousedown', (event) => {
    if (!materialContextMenu.element.contains(event.target)) {
        materialContextMenu.hide();
    }
});

