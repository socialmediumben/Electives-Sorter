// State
let rawElectives = [];
let rawCampers = [];

let electivesMap = new Map(); // name -> { name, availabilities: {}, minC, maxC, minP, maxP, notes, resources: {}, mergeTarget: '', groupSize: 1 }
let instances = []; // { id, name, period: 'available' | 'Period 1'..., campers: [camperId...], isStaging: boolean }
let campersData = []; // { id, firstName, lastName, ... choices: [], assigned: {} }

let dynamicPeriods = []; 
let dynamicChoiceCols = [];

// Edit State
let currentEditingCamper = null;
let currentEditingElectiveName = null;
let currentEditingInstance = null;

// DOM Elements
const projectJsonInput = document.getElementById('project-json');
const projectStatus = document.getElementById('project-status');
const elCsvInput = document.getElementById('electives-csv');
const camperCsvInput = document.getElementById('campers-csv');
const elStatus = document.getElementById('electives-status');
const camperStatus = document.getElementById('campers-status');
const exportBtn = document.getElementById('export-btn');
const autoAssignBtn = document.getElementById('auto-assign-btn');
const warningsContainer = document.getElementById('warnings-container');
const warningsList = document.getElementById('warnings-list');

const camperSearch = document.getElementById('camper-search');
const camperThead = document.getElementById('camper-thead');
const camperTbody = document.getElementById('camper-tbody');
const kanbanBoard = document.getElementById('kanban-board');

// Elective Modal
const modal = document.getElementById('elective-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalCapacity = document.getElementById('modal-capacity');
const modalResources = document.getElementById('modal-resources');
const modalNotes = document.getElementById('modal-notes');
const modalCampersTbody = document.getElementById('modal-campers-tbody');
const unassignedHeader = document.getElementById('unassigned-header');
const unassignedContainer = document.getElementById('unassigned-container');

// Camper Modal
const camperModal = document.getElementById('camper-modal');
const closeCamperModalBtn = document.getElementById('close-camper-modal');

// Guide Modal
const guideBtn = document.getElementById('guide-btn');
const guideModal = document.getElementById('guide-modal');
const closeGuideModalBtn = document.getElementById('close-guide-modal');
const dlElectivesBtn = document.getElementById('dl-electives-template');
const dlCampersBtn = document.getElementById('dl-campers-template');

// Export Hub Modal
const exportModal = document.getElementById('export-modal');
const closeExportModalBtn = document.getElementById('close-export-modal');
const dlSaveProject = document.getElementById('dl-save-project');
const dlExportCamper = document.getElementById('dl-export-camper');
const dlExportInstructor = document.getElementById('dl-export-instructor');
const dlExportSchedule = document.getElementById('dl-export-schedule');

// Elective Edit elements
const editElectiveBtn = document.getElementById('edit-elective-btn');
const electiveViewContainer = document.getElementById('elective-view-container');
const electiveEditContainer = document.getElementById('elective-edit-container');
const editElMaxC = document.getElementById('edit-el-max-c');
const editElMinC = document.getElementById('edit-el-min-c');
const editElGroupSize = document.getElementById('edit-el-group-size');
const editElMergeTarget = document.getElementById('edit-el-merge-target');
const editElInstructor = document.getElementById('edit-el-instructor');
const editElLocation = document.getElementById('edit-el-location');
const editElSupplies = document.getElementById('edit-el-supplies');
const editElNotes = document.getElementById('edit-el-notes');
const editElPeriodsContainer = document.getElementById('edit-el-periods-container');
const cancelElEditBtn = document.getElementById('cancel-el-edit-btn');
const saveElEditBtn = document.getElementById('save-el-edit-btn');

// Camper Edit elements
const editCamperBtn = document.getElementById('edit-camper-btn');
const camperViewContainer = document.getElementById('camper-view-container');
const camperEditContainer = document.getElementById('camper-edit-container');
const editCamperFirst = document.getElementById('edit-camper-first');
const editCamperLast = document.getElementById('edit-camper-last');
const editCamperEmail = document.getElementById('edit-camper-email');
const editCamperOrg = document.getElementById('edit-camper-org');
const editCamperNotes = document.getElementById('edit-camper-notes');
const editCamperChoicesContainer = document.getElementById('edit-camper-choices-container');
const cancelCamperEditBtn = document.getElementById('cancel-camper-edit-btn');
const saveCamperEditBtn = document.getElementById('save-camper-edit-btn');

// Drag State
let draggedItem = null; 
let draggedType = null; 

// Sorting State
let sortCol = 'name';
let sortAsc = true;

// Initialization
function init() {
    projectJsonInput.addEventListener('change', handleProjectUpload);
    elCsvInput.addEventListener('change', handleElectiveUpload);
    camperCsvInput.addEventListener('change', handleCamperUpload);
    
    exportBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
    closeExportModalBtn.addEventListener('click', () => exportModal.classList.add('hidden'));
    dlSaveProject.addEventListener('click', saveProjectFile);
    dlExportCamper.addEventListener('click', exportCamperCSV);
    dlExportInstructor.addEventListener('click', printInstructorRosters);
    dlExportSchedule.addEventListener('click', exportScheduleCSV);
    
    editElectiveBtn.addEventListener('click', toggleElectiveEditMode);
    cancelElEditBtn.addEventListener('click', () => showElectiveViewMode());
    saveElEditBtn.addEventListener('click', saveElectiveEdits);

    editCamperBtn.addEventListener('click', toggleCamperEditMode);
    cancelCamperEditBtn.addEventListener('click', () => showCamperViewMode());
    saveCamperEditBtn.addEventListener('click', saveCamperEdits);
    
    autoAssignBtn.addEventListener('click', () => {
        autoAssignBtn.disabled = true;
        autoAssignBtn.textContent = 'Optimizing...';
        setTimeout(() => {
            optimizeAssignments();
            autoAssignBtn.disabled = false;
            autoAssignBtn.textContent = 'Auto-Assign';
        }, 50);
    });
    camperSearch.addEventListener('input', renderCampers);
    
    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
    closeCamperModalBtn.addEventListener('click', () => camperModal.classList.add('hidden'));
    
    guideBtn.addEventListener('click', () => guideModal.classList.remove('hidden'));
    closeGuideModalBtn.addEventListener('click', () => guideModal.classList.add('hidden'));
    dlElectivesBtn.addEventListener('click', downloadElectivesTemplate);
    dlCampersBtn.addEventListener('click', downloadCampersTemplate);
}

function updateSortHeaders() {
    const camperHeaders = document.querySelectorAll('#camper-table th[data-sort]');
    camperHeaders.forEach(th => {
        const span = th.querySelector('span');
        if (th.dataset.sort === sortCol) {
            span.textContent = sortAsc ? ' ↑' : ' ↓';
        } else {
            span.textContent = '';
        }
    });
}

function downloadElectivesTemplate() {
    const csv = "Elective Name,Maximum Capacity,Minimum Capacity,Maximum Periods,Minimum Periods,Available Period 1,Available Period 2,Available Period 3,Group Size,Supplies,Location,Instructor,Merge,Notes\n" +
                "Archery,12,6,3,1,TRUE,TRUE,TRUE,1,Bows & Arrows,Field A,Coach John,,Wear closed-toe shoes\n" +
                "Advanced Archery,8,4,2,0,FALSE,TRUE,TRUE,1,Compound Bows,Field A,Coach John,Archery,Must have prior experience\n" +
                "Pickleball,16,4,3,2,TRUE,TRUE,TRUE,4,Paddles,Courts,Mr. Pickle,,Needs groups of 4\n";
    downloadCSV(csv, "electives_template.csv");
}

function downloadCampersTemplate() {
    const csv = "ID,First Name,Last Name,Email,Organization,Date,Notes,Archery,Advanced Archery,Pickleball\n" +
                "101,Alice,Smith,alice@example.com,Troop 1,2023-10-01,Allergic to bees,First Choice,Second Choice,Third Choice\n" +
                "102,Bob,Jones,bob@example.com,Troop 2,2023-10-02,,Third Choice,First Choice,Second Choice\n";
    downloadCSV(csv, "campers_template.csv");
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility: Case-insensitive property lookup
function getVal(row, keyArr) {
    for (let k of Object.keys(row)) {
        const lk = k.toLowerCase().trim();
        if (keyArr.includes(lk)) return row[k];
    }
    return undefined;
}

// File Uploads
function handleElectiveUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawElectives = results.data;
            
            dynamicPeriods = [];
            results.meta.fields.forEach(field => {
                if (field.toLowerCase().includes('available period')) {
                    const pName = field.replace(/available /i, '').trim();
                    dynamicPeriods.push({ field, pName });
                }
            });

            processElectives(rawElectives);
            elStatus.textContent = 'Loaded';
            elStatus.className = 'status-badge success';
            checkReady();
        }
    });
}

function handleCamperUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawCampers = results.data;
            dynamicChoiceCols = results.meta.fields.filter(field => field.toLowerCase().includes('choice'));
            
            processCampers(rawCampers);
            
            camperStatus.textContent = 'Loaded';
            camperStatus.className = 'status-badge success';
            checkReady();
        }
    });
}

function buildCamperTableHeaders() {
    camperThead.innerHTML = '';
    const tr = document.createElement('tr');
    
    const thName = document.createElement('th');
    thName.dataset.sort = 'name';
    thName.innerHTML = 'Name <span></span>';
    tr.appendChild(thName);

    dynamicChoiceCols.forEach((col, index) => {
        const th = document.createElement('th');
        th.dataset.sort = `c${index}`;
        th.innerHTML = `${col} <span></span>`;
        tr.appendChild(th);
    });

    camperThead.appendChild(tr);

    const camperHeaders = document.querySelectorAll('#camper-table th[data-sort]');
    camperHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortCol === col) {
                sortAsc = !sortAsc;
            } else {
                sortCol = col;
                sortAsc = true;
            }
            updateSortHeaders();
            renderCampers();
        });
    });
    updateSortHeaders();
}

function isChecked(val) {
    if (!val) return false;
    val = val.toString().trim().toLowerCase();
    return val === 'true' || val === 'yes' || val === '1' || val === 'checked' || val === 'x' || val.includes('true');
}

function processElectives(data) {
    electivesMap.clear();
    instances = [];

    data.forEach(row => {
        const name = getVal(row, ['elective name', 'elective']);
        if (!name) return;

        const maxPeriods = parseInt(getVal(row, ['maximum periods'])) || 0;
        const capacity = parseInt(getVal(row, ['maximum capacity', 'maximum campers', 'capacity'])) || 99;
        
        const availabilities = {};
        dynamicPeriods.forEach(p => {
            availabilities[p.pName] = isChecked(getVal(row, [p.field.toLowerCase()]));
        });

        const resources = {};
        const supplies = getVal(row, ['supplies'])?.trim();
        const loc = getVal(row, ['location'])?.trim();
        const instructor = getVal(row, ['instructor'])?.trim();
        if (supplies) resources['Supplies'] = supplies;
        if (loc) resources['Location'] = loc;
        if (instructor) resources['Instructor'] = instructor;

        const elective = {
            name: name,
            availabilities: availabilities,
            minC: parseInt(getVal(row, ['minimum campers', 'minimum capacity'])) || 0,
            maxC: capacity,
            minP: parseInt(getVal(row, ['minimum periods'])) || 0,
            maxP: maxPeriods,
            notes: getVal(row, ['notes']) || '',
            resources: resources,
            mergeTarget: getVal(row, ['merge'])?.trim() || '',
            groupSize: parseInt(getVal(row, ['group size', 'group'])) || 1
        };
        electivesMap.set(name, elective);

        instances.push({
            id: `staging-${name.replace(/\s+/g, '-')}`,
            name: name,
            period: 'available',
            campers: [],
            isStaging: true
        });
    });

    buildKanbanBoard();
    renderElectives();
}

function buildKanbanBoard() {
    kanbanBoard.innerHTML = '';
    
    const colAvail = document.createElement('div');
    colAvail.className = 'kanban-column';
    colAvail.id = 'col-available';
    colAvail.innerHTML = `
        <h3>Available</h3>
        <div class="kanban-dropzone" data-period="available"></div>
    `;
    kanbanBoard.appendChild(colAvail);

    dynamicPeriods.forEach(p => {
        const col = document.createElement('div');
        col.className = 'kanban-column';
        col.id = `col-${p.pName.replace(/\s+/g, '-')}`;
        col.innerHTML = `
            <h3>${p.pName}</h3>
            <div class="kanban-dropzone" data-period="${p.pName}"></div>
        `;
        kanbanBoard.appendChild(col);
    });

    setupKanbanDropzones();
}

function processCampers(data) {
    let maxChoices = 0;
    
    campersData = data.map(row => {
        let choiceMap = [];
        const ignoredColumns = ['camper id', 'id', 'first name', 'last name', 'email', 'organization', 'date', 'notes'];
        
        Object.keys(row).forEach(key => {
            const lowerKey = key.toLowerCase().trim();
            if (!ignoredColumns.includes(lowerKey)) {
                const val = row[key]?.trim().toLowerCase();
                if (val) {
                    let rank = 999;
                    if (val.includes('one') || val === '1' || val.includes('first')) rank = 1;
                    else if (val.includes('two') || val === '2' || val.includes('second')) rank = 2;
                    else if (val.includes('three') || val === '3' || val.includes('third')) rank = 3;
                    else if (val.includes('four') || val === '4' || val.includes('fourth')) rank = 4;
                    else if (val.includes('five') || val === '5' || val.includes('fifth')) rank = 5;
                    else if (val.includes('six') || val === '6' || val.includes('sixth')) rank = 6;
                    else if (val.includes('seven') || val === '7' || val.includes('seventh')) rank = 7;
                    else if (val.includes('eight') || val === '8' || val.includes('eighth')) rank = 8;
                    else if (val.includes('nine') || val === '9' || val.includes('ninth')) rank = 9;
                    else if (val.includes('ten') || val === '10' || val.includes('tenth')) rank = 10;
                    else {
                        const num = parseInt(val.replace(/\D/g,''));
                        if (!isNaN(num)) rank = num;
                    }
                    
                    if (rank !== 999) {
                        choiceMap.push({ elective: key.trim(), rank: rank });
                    }
                }
            }
        });
        
        choiceMap.sort((a, b) => a.rank - b.rank);
        const choices = choiceMap.map(c => c.elective);
        if (choices.length > maxChoices) maxChoices = choices.length;

        const assigned = { 'available': null };
        dynamicPeriods.forEach(p => {
            assigned[p.pName] = null;
        });

        const camperId = getVal(row, ['camper id', 'id']);

        return {
            id: camperId,
            choices: choices,
            assigned: assigned,
            firstName: getVal(row, ['first name']) || '',
            lastName: getVal(row, ['last name']) || '',
            email: getVal(row, ['email']) || '',
            organization: getVal(row, ['organization']) || '',
            date: getVal(row, ['date']) || '',
            notes: getVal(row, ['notes']) || ''
        };
    }).filter(c => c.id);

    dynamicChoiceCols = [];
    for (let i = 1; i <= maxChoices; i++) {
        dynamicChoiceCols.push(`Choice ${i}`);
    }

    buildCamperTableHeaders();
    renderCampers();
}

function checkReady() {
    if (rawElectives.length > 0 && rawCampers.length > 0) {
        exportBtn.disabled = false;
        autoAssignBtn.disabled = false;
        renderCampers();
        renderElectives();
    }
}

// Resource Conflict Check
function hasResourceConflict(electiveName, targetPeriod, checkInstances) {
    if (targetPeriod === 'available') return false;
    
    const targetElective = electivesMap.get(electiveName);
    if (!targetElective) return false;
    
    const targetResources = Object.values(targetElective.resources);
    if (targetResources.length === 0) return false;

    const activeInPeriod = checkInstances.filter(i => !i.isStaging && i.period === targetPeriod && i.name !== electiveName);
    
    for (let inst of activeInPeriod) {
        const otherElective = electivesMap.get(inst.name);
        if (!otherElective) continue;
        const otherResources = Object.values(otherElective.resources);
        
        for (let r of targetResources) {
            if (otherResources.includes(r)) {
                return `Conflict with ${inst.name} (Shared resource: ${r})`;
            }
        }
    }
    return false;
}

// Optimization Algorithm
function optimizeAssignments() {
    const ITERATIONS = 200;
    let bestScore = Infinity;
    let bestSetup = null;

    let lockedInstances = instances.filter(i => !i.isStaging).map(i => ({
        name: i.name,
        period: i.period,
        campers: [...i.campers]
    }));

    let lockedCamperAssignments = {}; 
    campersData.forEach(c => {
        lockedCamperAssignments[c.id] = {};
        dynamicPeriods.forEach(p => {
            if (c.assigned[p.pName]) {
                const inst = instances.find(i => i.id === c.assigned[p.pName]);
                if (inst) lockedCamperAssignments[c.id][p.pName] = inst.name;
            }
        });
    });

    for (let iter = 0; iter < ITERATIONS; iter++) {
        let result = generateRandomSchedule(lockedInstances, lockedCamperAssignments);
        if (result.score < bestScore) {
            bestScore = result.score;
            bestSetup = result;
        }
    }

    if (bestSetup) {
        applySchedule(bestSetup);
    }
}

function generateRandomSchedule(lockedInstances, lockedCamperAssignments) {
    let score = 0;
    let warnings = [];
    let scheduleInstances = []; 
    let camperState = {}; 

    campersData.forEach(c => {
        camperState[c.id] = { ...lockedCamperAssignments[c.id] };
    });

    lockedInstances.forEach(li => {
        scheduleInstances.push({ name: li.name, period: li.period, campers: [...li.campers], locked: true });
    });

    let electiveNames = shuffleArray(Array.from(electivesMap.keys()));

    electiveNames.forEach(name => {
        const elective = electivesMap.get(name);
        let periodsRunning = scheduleInstances.filter(i => i.name === name).map(i => i.period);
        
        let validPeriods = dynamicPeriods.map(p => p.pName).filter(p => elective.availabilities[p] && !periodsRunning.includes(p));
        validPeriods = shuffleArray(validPeriods);
        
        let neededMin = Math.max(0, elective.minP - periodsRunning.length);
        
        for (let i = 0; i < validPeriods.length; i++) {
            if (neededMin <= 0) break;
            const p = validPeriods[i];
            if (!hasResourceConflict(name, p, scheduleInstances)) {
                scheduleInstances.push({ name: name, period: p, campers: [], locked: false });
                periodsRunning.push(p);
                neededMin--;
            }
        }

        let canSpawn = elective.maxP - periodsRunning.length;
        for (let i = 0; i < validPeriods.length; i++) {
            if (canSpawn <= 0) break;
            const p = validPeriods[i];
            if (!periodsRunning.includes(p) && Math.random() > 0.5) {
                if (!hasResourceConflict(name, p, scheduleInstances)) {
                    scheduleInstances.push({ name: name, period: p, campers: [], locked: false });
                    periodsRunning.push(p);
                    canSpawn--;
                }
            }
        }

        if (periodsRunning.length < elective.minP) {
            score += 100000; 
            warnings.push(`Could not schedule ${name} for minimum required periods (Resource Conflict or No Demand).`);
        }
    });

    let shuffledCampers = shuffleArray([...campersData]);

    shuffledCampers.forEach(camper => {
        dynamicPeriods.forEach(p => {
            const period = p.pName;
            if (camperState[camper.id][period]) return; 

            let assigned = false;
            for (let i = 0; i < camper.choices.length; i++) {
                const choiceName = camper.choices[i];
                if (!choiceName) continue;

                const alreadyInElective = dynamicPeriods.some(otherP => camperState[camper.id][otherP.pName] === choiceName);
                if (alreadyInElective) continue;

                const inst = scheduleInstances.find(inst => inst.name === choiceName && inst.period === period);
                if (inst) {
                    const elective = electivesMap.get(choiceName);
                    if (inst.campers.length < elective.maxC) {
                        inst.campers.push(camper.id);
                        camperState[camper.id][period] = choiceName;
                        assigned = true;
                        break;
                    }
                }
            }

            if (!assigned) {
                 const fallbackInsts = shuffleArray(scheduleInstances.filter(inst => inst.period === period));
                 for(let inst of fallbackInsts) {
                     const elective = electivesMap.get(inst.name);
                     const alreadyInElective = dynamicPeriods.some(otherP => camperState[camper.id][otherP.pName] === inst.name);
                     if (!alreadyInElective && inst.campers.length < elective.maxC) {
                         inst.campers.push(camper.id);
                         camperState[camper.id][period] = inst.name;
                         assigned = true;
                         break;
                     }
                 }
            }
        });
    });

    // 3. Min Capacity Fixer
    scheduleInstances.forEach(inst => {
        if (inst.isSynthetic) return;
        const elective = electivesMap.get(inst.name);
        if (inst.campers.length < elective.minC) {
            let needed = elective.minC - inst.campers.length;
            const otherInstances = scheduleInstances.filter(other => other.period === inst.period && other.name !== inst.name && !other.locked && !other.isSynthetic);
            
            for (let other of otherInstances) {
                if (needed <= 0) break;
                const otherElective = electivesMap.get(other.name);
                let canSteal = other.campers.length - otherElective.minC;
                if (canSteal <= 0) continue;

                let targets = other.campers.filter(cid => {
                    const c = campersData.find(camper => camper.id === cid);
                    return c.choices.includes(inst.name) && !camperState[cid][inst.period + "_locked"];
                });

                for (let tid of targets) {
                    if (needed <= 0 || canSteal <= 0) break;
                    other.campers = other.campers.filter(id => id !== tid);
                    inst.campers.push(tid);
                    camperState[tid][inst.period] = inst.name;
                    needed--;
                    canSteal--;
                }
            }
        }
    });

    // 3.2 Group Size Fixer
    scheduleInstances.forEach(inst => {
        if (inst.isSynthetic || inst.locked) return; 
        const elective = electivesMap.get(inst.name);
        const gs = elective.groupSize;
        if (gs > 1) {
            let r = inst.campers.length % gs;
            if (r !== 0) {
                let needed = gs - r;
                if (inst.campers.length + needed <= elective.maxC) {
                    // Try Upscale
                    let stolen = 0;
                    const otherInstances = scheduleInstances.filter(other => other.period === inst.period && other.name !== inst.name && !other.locked && !other.isSynthetic);
                    
                    for (let other of otherInstances) {
                        if (stolen === needed) break;
                        const otherElective = electivesMap.get(other.name);
                        let canSteal = other.campers.length - otherElective.minC;
                        if (canSteal <= 0) continue;

                        let targets = other.campers.filter(cid => {
                            const c = campersData.find(camper => camper.id === cid);
                            return c.choices.includes(inst.name) && !camperState[cid][inst.period + "_locked"];
                        });

                        for (let tid of targets) {
                            if (stolen === needed || canSteal <= 0) break;
                            other.campers = other.campers.filter(id => id !== tid);
                            inst.campers.push(tid);
                            camperState[tid][inst.period] = inst.name;
                            stolen++;
                            canSteal--;
                        }
                    }

                    if (stolen < needed) {
                        // Upscale failed -> Downscale (drop stolen + remainder)
                        let toDrop = r + stolen;
                        for (let i = 0; i < toDrop; i++) {
                            const droppedCid = inst.campers.pop();
                            camperState[droppedCid][inst.period] = null;
                        }
                    }
                } else {
                    // Cannot upscale due to Max Capacity -> Downscale
                    for (let i = 0; i < r; i++) {
                        const droppedCid = inst.campers.pop();
                        camperState[droppedCid][inst.period] = null;
                    }
                }
            }
        }
    });

    let mergedThisIteration = new Set();
    
    // 3.5 Merge Checking
    scheduleInstances.forEach(inst => {
        if (inst.isSynthetic || mergedThisIteration.has(inst.name)) return;
        const elective = electivesMap.get(inst.name);
        
        if (inst.campers.length < elective.minC && elective.mergeTarget) {
            const targetName = elective.mergeTarget;
            const targetInst = scheduleInstances.find(i => i.period === inst.period && i.name === targetName);
            
            if (targetInst && !targetInst.isSynthetic && !mergedThisIteration.has(targetName)) {
                const targetElective = electivesMap.get(targetName);
                const targetIsStruggling = targetInst.campers.length < targetElective.minC;
                const combinedCapacity = Math.max(elective.maxC, targetElective.maxC);
                const canAbsorb = (inst.campers.length + targetInst.campers.length) <= combinedCapacity;
                
                if (targetIsStruggling || canAbsorb) {
                    let primaryInst, secondaryInst, primaryElec, secondaryElec;
                    if (targetInst.campers.length >= inst.campers.length) {
                        primaryInst = targetInst; secondaryInst = inst;
                        primaryElec = targetElective; secondaryElec = elective;
                    } else {
                        primaryInst = inst; secondaryInst = targetInst;
                        primaryElec = elective; secondaryElec = targetElective;
                    }
                    
                    const mergedName = `${primaryInst.name} / ${secondaryInst.name}`;
                    let combinedCampers = [...primaryInst.campers, ...secondaryInst.campers];
                    
                    if (combinedCampers.length > combinedCapacity) {
                         combinedCampers = combinedCampers.slice(0, combinedCapacity);
                    }
                    
                    // Downscale to inherited Group Size
                    let r = combinedCampers.length % primaryElec.groupSize;
                    if (r !== 0) {
                        for (let i = 0; i < r; i++) {
                            const droppedCid = combinedCampers.pop();
                            camperState[droppedCid][inst.period] = null;
                        }
                    }
                    
                    const mergedInst = {
                        name: mergedName,
                        period: inst.period,
                        campers: combinedCampers,
                        locked: false,
                        isSynthetic: true,
                        syntheticData: {
                            name: mergedName,
                            availabilities: primaryElec.availabilities, 
                            minC: primaryElec.minC,
                            maxC: combinedCapacity,
                            minP: 0, maxP: 99,
                            notes: `Automatically merged from ${primaryInst.name} and ${secondaryInst.name}`,
                            resources: primaryElec.resources,
                            mergeTarget: '',
                            groupSize: primaryElec.groupSize
                        }
                    };
                    
                    mergedInst.campers.forEach(cid => {
                        camperState[cid][inst.period] = mergedName;
                    });
                    
                    scheduleInstances = scheduleInstances.filter(i => i !== inst && i !== targetInst);
                    scheduleInstances.push(mergedInst);
                    mergedThisIteration.add(inst.name);
                    mergedThisIteration.add(targetName);
                    
                    warnings.push(`Merged ${primaryInst.name} and ${secondaryInst.name} in ${inst.period} due to low attendance.`);
                }
            }
        }
    });

    scheduleInstances = scheduleInstances.filter(inst => {
        const elective = electivesMap.get(inst.name);
        
        // Final penalty checks
        if (!inst.isSynthetic && inst.campers.length % elective.groupSize !== 0) {
            score += 50000;
            warnings.push(`${inst.name} in ${inst.period} is not a multiple of ${elective.groupSize}.`);
        }
        
        if (inst.isSynthetic) return true;
        
        if (inst.campers.length < elective.minC) {
            let runningCount = scheduleInstances.filter(i => i.name === inst.name).length;
            if (!inst.locked && runningCount > elective.minP) {
                inst.campers.forEach(cid => {
                    camperState[cid][inst.period] = null;
                });
                return false;
            } else {
                score += (elective.minC - inst.campers.length) * 10000;
                warnings.push(`${inst.name} in ${inst.period} is below minimum capacity (${inst.campers.length}/${elective.minC}).`);
            }
        }
        return true;
    });

    campersData.forEach(c => {
        dynamicPeriods.forEach(p => {
            const assignedName = camperState[c.id][p.pName];
            if (!assignedName) {
                score += 1000; 
            } else {
                const choiceIdx = c.choices.indexOf(assignedName);
                if (choiceIdx !== -1) {
                    score += (choiceIdx + 1) * 10;
                } else {
                    score += 100; 
                }
            }
        });
    });

    warnings = [...new Set(warnings)];

    return { score, instances: scheduleInstances, warnings, camperState };
}

function applySchedule(setup) {
    const staging = instances.filter(i => i.isStaging);
    instances = [...staging];

    setup.instances.forEach(si => {
        if (si.isSynthetic && !electivesMap.has(si.name)) {
            electivesMap.set(si.name, si.syntheticData);
            instances.push({
                id: `staging-${si.name.replace(/\s+/g, '-')}`,
                name: si.name,
                period: 'available',
                campers: [],
                isStaging: true
            });
        }
    });

    let instanceIdMap = {}; 
    setup.instances.forEach((si, index) => {
        const newId = `inst-auto-${Date.now()}-${index}`;
        instances.push({
            id: newId,
            name: si.name,
            period: si.period,
            campers: si.campers,
            isStaging: false
        });
        instanceIdMap[`${si.name}-${si.period}`] = newId;
    });

    campersData.forEach(c => {
        dynamicPeriods.forEach(p => {
            const assignedName = setup.camperState[c.id][p.pName];
            if (assignedName) {
                c.assigned[p.pName] = instanceIdMap[`${assignedName}-${p.pName}`] || null;
            } else {
                c.assigned[p.pName] = null;
            }
        });
    });

    renderElectives();
    renderCampers();

    warningsList.innerHTML = '';
    if (setup.warnings.length > 0) {
        setup.warnings.forEach(w => {
            const li = document.createElement('li');
            li.textContent = w;
            warningsList.appendChild(li);
        });
        warningsContainer.style.display = 'block';
    } else {
        warningsContainer.style.display = 'none';
    }
}

function shuffleArray(array) {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
}

// Rendering
function renderCampers() {
    if (campersData.length === 0) return;

    const query = camperSearch.value.toLowerCase();
    
    let filtered = campersData.filter(c => {
        return c.id.toLowerCase().includes(query) || 
               c.choices.some(choice => choice.toLowerCase().includes(query));
    });

    filtered.sort((a, b) => {
        let valA, valB;
        if (sortCol === 'name') {
            valA = (`${a.firstName} ${a.lastName}`.trim() || a.id).toLowerCase();
            valB = (`${b.firstName} ${b.lastName}`.trim() || b.id).toLowerCase();
        } else {
            const index = parseInt(sortCol.replace('c', ''));
            valA = (a.choices[index] || '').toLowerCase();
            valB = (b.choices[index] || '').toLowerCase();
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    camperTbody.innerHTML = '';
    filtered.forEach(camper => {
        const tr = document.createElement('tr');
        tr.className = 'camper-row';
        tr.draggable = true;
        tr.dataset.camperId = camper.id;

        tr.addEventListener('click', (e) => {
            if (draggedItem) return;
            openCamperModal(camper);
        });

        tr.addEventListener('dragstart', (e) => {
            draggedItem = camper;
            draggedType = 'camper';
            e.dataTransfer.setData('text/plain', camper.id);
            setTimeout(() => tr.style.opacity = '0.5', 0);
        });
        tr.addEventListener('dragend', () => {
            tr.style.opacity = '1';
            draggedItem = null;
            draggedType = null;
        });

        const tdName = document.createElement('td');
        tdName.textContent = `${camper.firstName} ${camper.lastName}`.trim() || camper.id;
        tr.appendChild(tdName);

        camper.choices.forEach(choice => {
            const td = document.createElement('td');
            td.textContent = choice;
            td.className = 'choice-cell';
            
            const isFulfilled = dynamicPeriods.some(p => {
                const instId = camper.assigned[p.pName];
                if (!instId) return false;
                const inst = instances.find(i => i.id === instId);
                return inst && inst.name === choice;
            });

            const stagedInstId = camper.assigned['available'];
            let isStaged = false;
            if (stagedInstId) {
                const inst = instances.find(i => i.id === stagedInstId);
                isStaged = (inst && inst.name === choice);
            }

            if (isFulfilled) {
                td.classList.add('fulfilled');
            } else if (isStaged) {
                td.classList.add('staged');
            }

            tr.appendChild(td);
        });

        camperTbody.appendChild(tr);
    });
}

function renderElectives() {
    if (instances.length === 0) return;

    document.querySelectorAll('.kanban-dropzone').forEach(dz => dz.innerHTML = '');

    electivesMap.forEach((elective, name) => {
        dynamicPeriods.forEach(p => {
            if (elective.availabilities[p.pName]) {
                const col = document.querySelector(`.kanban-dropzone[data-period="${p.pName}"]`);
                if (col) col.appendChild(createPlaceholder(name, p.pName));
            }
        });
    });

    instances.forEach(inst => {
        const card = createElectiveCard(inst);
        const col = document.querySelector(`.kanban-dropzone[data-period="${inst.period}"]`);
        if (col) {
            if (inst.isStaging) {
                col.appendChild(card);
            } else {
                replacePlaceholderOrAppend(col, card, inst.name);
            }
        }
    });
}

function replacePlaceholderOrAppend(container, card, name) {
    const placeholders = Array.from(container.querySelectorAll(`.elective-placeholder[data-name="${name}"]`));
    const visiblePlaceholder = placeholders.find(p => p.style.display !== 'none');
    if (visiblePlaceholder) {
        visiblePlaceholder.style.display = 'none';
        container.insertBefore(card, visiblePlaceholder);
    } else {
        container.appendChild(card);
    }
}

function createPlaceholder(name, period) {
    const div = document.createElement('div');
    div.className = 'elective-placeholder';
    div.dataset.name = name;
    div.dataset.period = period;
    div.textContent = `Drop ${name} here`;
    return div;
}

function createElectiveCard(inst) {
    const elective = electivesMap.get(inst.name);
    const div = document.createElement('div');
    div.className = 'elective-card draggable';
    div.draggable = true;
    div.dataset.id = inst.id;

    let displayCapacity = 0;
    let isFull = false;
    let subtitle = '';
    const currentC = inst.campers.length;

    if (inst.isStaging) {
        const activeInstances = instances.filter(i => !i.isStaging && i.name === inst.name);
        const totalAssignedToActive = activeInstances.reduce((sum, i) => sum + i.campers.length, 0);
        
        displayCapacity = (elective.maxP * elective.maxC) - totalAssignedToActive;
        isFull = currentC >= displayCapacity;
        
        const instancesRemaining = elective.maxP - activeInstances.length;
        subtitle = `Staging (${instancesRemaining} left)`;
        
        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">${inst.name}</div>
                <div class="card-capacity ${isFull ? 'full' : ''}">${currentC}/${displayCapacity}</div>
            </div>
            <div style="font-size: 0.75rem; color: #d97706; font-weight: 600;">
                ${subtitle}
            </div>
        `;
    } else {
        displayCapacity = elective.maxC;
        isFull = currentC >= displayCapacity;
        subtitle = inst.period;
        
        const underMin = currentC < elective.minC;
        const remainder = elective.groupSize > 1 ? currentC % elective.groupSize : 0;
        let groupWarning = '';
        if (remainder !== 0) {
            const needed = elective.groupSize - remainder;
            groupWarning = `<span style="color:#eab308; display:block; margin-top: 2px;">(Needs +${needed} for groups of ${elective.groupSize})</span>`;
        }
        
        div.innerHTML = `
            <div class="card-header">
                <div class="card-title">${inst.name}</div>
                <div class="card-capacity ${isFull ? 'full' : ''} ${underMin || remainder !== 0 ? 'under' : ''}">${currentC}/${displayCapacity}</div>
            </div>
            <div style="font-size: 0.75rem; color: #64748b;">
                ${subtitle} 
                ${underMin ? `<span style="color:#ef4444">(Min ${elective.minC})</span>` : ''}
                ${groupWarning}
            </div>
        `;
    }

    div.addEventListener('click', (e) => {
        if (draggedItem) return;
        openModal(inst);
    });

    div.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedItem = inst;
        draggedType = 'elective';
        e.dataTransfer.setData('text/plain', inst.id);
        setTimeout(() => div.classList.add('dragging'), 0);
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
        draggedItem = null;
        draggedType = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    div.addEventListener('dragenter', (e) => {
        if (draggedType === 'camper') e.preventDefault();
    });

    div.addEventListener('dragover', (e) => {
        if (draggedType === 'camper') {
            e.preventDefault();
            div.classList.add('drag-over');
        }
    });

    div.addEventListener('dragleave', () => {
        div.classList.remove('drag-over');
    });

    div.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        div.classList.remove('drag-over');
        
        if (draggedType === 'camper') {
            assignCamper(draggedItem, inst);
        }
    });

    return div;
}

// Kanban Dropzones
function setupKanbanDropzones() {
    const zones = document.querySelectorAll('.kanban-dropzone');
    
    zones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            if (draggedType === 'elective') {
                const targetPeriod = zone.dataset.period;
                const elective = electivesMap.get(draggedItem.name);
                
                let isValid = false;
                if (targetPeriod === 'available') isValid = true;
                else if (elective.availabilities[targetPeriod]) {
                    if (!hasResourceConflict(elective.name, targetPeriod, instances)) {
                        isValid = true;
                    }
                }

                if (isValid) {
                    e.preventDefault();
                    zone.parentElement.style.backgroundColor = '#cbd5e1';
                }
            }
        });

        zone.addEventListener('dragleave', e => {
            zone.parentElement.style.backgroundColor = '';
        });

        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.parentElement.style.backgroundColor = '';
            if (draggedType === 'elective') {
                const targetPeriod = zone.dataset.period;
                moveElective(draggedItem, targetPeriod);
            }
        });
    });
}

function moveElective(inst, targetPeriod) {
    const elective = electivesMap.get(inst.name);
    
    if (targetPeriod !== 'available' && !elective.availabilities[targetPeriod]) {
        alert(`${inst.name} is not available in ${targetPeriod}`);
        return;
    }

    if (targetPeriod !== 'available') {
        const conflict = hasResourceConflict(inst.name, targetPeriod, instances);
        if (conflict) {
            alert(conflict);
            return;
        }
    }

    if (targetPeriod === 'available') {
        if (!inst.isStaging) {
            instances = instances.filter(i => i.id !== inst.id);
            inst.campers.forEach(cId => {
                const camper = campersData.find(c => c.id === cId);
                if (camper) camper.assigned[inst.period] = null;
            });
            alert(`Deleted ${inst.name} from ${inst.period}. Campers were unassigned.`);
        }
        renderElectives();
        renderCampers();
        return;
    }

    if (inst.isStaging) {
        spawnElective(inst, targetPeriod);
        return;
    }

    inst.period = targetPeriod;
    if (inst.campers.length > 0) {
       inst.campers.forEach(cId => {
            const camper = campersData.find(c => c.id === cId);
            if (camper) {
                dynamicPeriods.forEach(p => {
                    if (camper.assigned[p.pName] === inst.id) camper.assigned[p.pName] = null;
                });
            }
        });
        inst.campers = [];
        alert(`Moving ${inst.name} to a different period cleared its enrolled campers to avoid conflicts.`);
    }

    renderElectives();
    renderCampers();
}

function spawnElective(stagingInst, targetPeriod) {
    const elective = electivesMap.get(stagingInst.name);
    const activeInstances = instances.filter(i => !i.isStaging && i.name === stagingInst.name);
    
    if (activeInstances.length >= elective.maxP) {
        alert(`Cannot create another instance of ${stagingInst.name}. Max periods (${elective.maxP}) reached.`);
        return;
    }

    const newId = `inst-${Date.now()}`;
    instances.push({
        id: newId,
        name: stagingInst.name,
        period: targetPeriod,
        campers: [],
        isStaging: false
    });

    renderElectives();
}

function assignCamper(camper, inst) {
    const elective = electivesMap.get(inst.name);
    const period = inst.period; 
    
    let maxCapacity = elective.maxC;
    if (inst.isStaging) {
        const activeInstances = instances.filter(i => !i.isStaging && i.name === inst.name);
        const totalAssignedToActive = activeInstances.reduce((sum, i) => sum + i.campers.length, 0);
        maxCapacity = (elective.maxP * elective.maxC) - totalAssignedToActive;
    }

    if (inst.campers.length >= maxCapacity) {
        alert(`${inst.name} is full!`);
        return;
    }

    if (!inst.isStaging && camper.assigned[period]) {
        alert(`Camper ${camper.id} is already assigned to an elective in ${period}`);
        return;
    }

    if (inst.isStaging && camper.assigned['available'] && camper.assigned['available'] !== inst.id) {
        if (camper.assigned['available']) {
             const prevStaging = instances.find(i => i.id === camper.assigned['available']);
             if (prevStaging) prevStaging.campers = prevStaging.campers.filter(id => id !== camper.id);
        }
    }

    if (inst.campers.includes(camper.id)) return;

    camper.assigned[period] = inst.id;
    inst.campers.push(camper.id);

    renderElectives();
    renderCampers();
    
    if (!modal.classList.contains('hidden') && modalTitle.textContent.includes(inst.name)) {
        openModal(inst);
    }
}

function unassignCamper(camperId, instId) {
    const camper = campersData.find(c => c.id === camperId);
    const inst = instances.find(i => i.id === instId);

    if (camper && inst) {
        if (inst.isStaging) {
            camper.assigned['available'] = null;
        } else {
            dynamicPeriods.forEach(p => {
                if (camper.assigned[p.pName] === inst.id) camper.assigned[p.pName] = null;
            });
        }
        inst.campers = inst.campers.filter(id => id !== camperId);
    }
    
    if (!modal.classList.contains('hidden')) openModal(inst);
    if (!camperModal.classList.contains('hidden')) openCamperModal(camper);
    
    renderElectives();
    renderCampers();
}

// Modals
function showElectiveViewMode() {
    electiveViewContainer.classList.remove('hidden');
    electiveEditContainer.classList.add('hidden');
    editElectiveBtn.textContent = "Edit Config";
    editElectiveBtn.style.background = "#0ea5e9";
}

function toggleElectiveEditMode() {
    if (electiveEditContainer.classList.contains('hidden')) {
        const elective = electivesMap.get(currentEditingElectiveName);
        if (!elective) return;

        editElMaxC.value = elective.maxC;
        editElMinC.value = elective.minC;
        editElGroupSize.value = elective.groupSize;
        editElInstructor.value = elective.resources['Instructor'] || '';
        editElLocation.value = elective.resources['Location'] || '';
        editElSupplies.value = elective.resources['Supplies'] || '';
        editElNotes.value = elective.notes || '';

        editElMergeTarget.innerHTML = '<option value="">None</option>';
        electivesMap.forEach((el, name) => {
            if (name !== currentEditingElectiveName) {
                const selected = elective.mergeTarget === name ? 'selected' : '';
                editElMergeTarget.innerHTML += `<option value="${name}" ${selected}>${name}</option>`;
            }
        });

        editElPeriodsContainer.innerHTML = '';
        dynamicPeriods.forEach(p => {
            const checked = elective.availabilities[p.pName] ? 'checked' : '';
            editElPeriodsContainer.innerHTML += `
                <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem;">
                    <input type="checkbox" data-period="${p.pName}" ${checked} />
                    ${p.pName}
                </label>
            `;
        });

        electiveViewContainer.classList.add('hidden');
        electiveEditContainer.classList.remove('hidden');
        editElectiveBtn.textContent = "View Config";
        editElectiveBtn.style.background = "#64748b";
    } else {
        showElectiveViewMode();
    }
}

function saveElectiveEdits() {
    const elective = electivesMap.get(currentEditingElectiveName);
    if (!elective) return;

    const newMaxC = parseInt(editElMaxC.value) || 99;
    const newMinC = parseInt(editElMinC.value) || 0;
    const newGroupSize = parseInt(editElGroupSize.value) || 1;
    const newMergeTarget = editElMergeTarget.value;
    const newInstructor = editElInstructor.value.trim();
    const newLocation = editElLocation.value.trim();
    const newSupplies = editElSupplies.value.trim();
    const newNotes = editElNotes.value.trim();

    const checkboxes = editElPeriodsContainer.querySelectorAll('input[type="checkbox"]');
    const newAvailabilities = {};
    let periodsDeactivated = [];

    checkboxes.forEach(cb => {
        const pName = cb.dataset.period;
        const isChecked = cb.checked;
        newAvailabilities[pName] = isChecked;

        if (elective.availabilities[pName] && !isChecked) {
            periodsDeactivated.push(pName);
        }
    });

    if (periodsDeactivated.length > 0) {
        const activeInstancesToClear = instances.filter(i => !i.isStaging && i.name === currentEditingElectiveName && periodsDeactivated.includes(i.period));
        if (activeInstancesToClear.length > 0) {
            const confirmMsg = `Warning: Changing availability will deactivate this elective for periods: ${periodsDeactivated.join(', ')}.\n` +
                               `Currently active classes in those periods (and their camper assignments) will be deleted.\n\n` +
                               `Do you want to proceed?`;
            if (!confirm(confirmMsg)) {
                return;
            }

            activeInstancesToClear.forEach(inst => {
                instances = instances.filter(i => i.id !== inst.id);
                inst.campers.forEach(cId => {
                    const camper = campersData.find(c => c.id === cId);
                    if (camper) camper.assigned[inst.period] = null;
                });
            });
        }
    }

    elective.maxC = newMaxC;
    elective.minC = newMinC;
    elective.groupSize = newGroupSize;
    elective.mergeTarget = newMergeTarget;
    elective.notes = newNotes;

    elective.resources = {};
    if (newSupplies) elective.resources['Supplies'] = newSupplies;
    if (newLocation) elective.resources['Location'] = newLocation;
    if (newInstructor) elective.resources['Instructor'] = newInstructor;

    elective.availabilities = newAvailabilities;

    alert("Elective configuration saved!");
    showElectiveViewMode();
    
    openModal(currentEditingInstance);
    renderElectives();
    renderCampers();
}

function openModal(inst) {
    currentEditingInstance = inst;
    currentEditingElectiveName = inst.name;
    showElectiveViewMode();

    const elective = electivesMap.get(inst.name);
    
    let displayCapacity = elective.maxC;
    if (inst.isStaging) {
        const activeInstances = instances.filter(i => !i.isStaging && i.name === inst.name);
        const totalAssignedToActive = activeInstances.reduce((sum, i) => sum + i.campers.length, 0);
        displayCapacity = (elective.maxP * elective.maxC) - totalAssignedToActive;
        modalTitle.textContent = `${inst.name} - Staging Area`;
    } else {
        modalTitle.textContent = `${inst.name} - ${inst.period}`;
    }

    const groupSizeText = elective.groupSize > 1 ? ` (Groups of ${elective.groupSize})` : '';
    modalCapacity.textContent = `${inst.campers.length}/${displayCapacity}${groupSizeText}`;
    modalNotes.textContent = elective.notes ? `Notes: ${elective.notes}` : '';
    
    modalResources.innerHTML = '';
    Object.keys(elective.resources).forEach(key => {
        modalResources.innerHTML += `<span style="background: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px;"><strong>${key}:</strong> ${elective.resources[key]}</span>`;
    });
    
    modalCampersTbody.innerHTML = '';
    if (inst.campers.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" style="text-align: center; color: #64748b; padding: 2rem;">No campers assigned</td>`;
        modalCampersTbody.appendChild(tr);
    } else {
        inst.campers.forEach(cId => {
            const camper = campersData.find(c => c.id === cId);
            if (!camper) return;

            let rankText = 'Not requested';
            if (inst.isSynthetic) {
                const nameParts = inst.name.split(' / ');
                let bestRank = 999;
                nameParts.forEach(part => {
                    const r = camper.choices.indexOf(part) + 1;
                    if (r > 0 && r < bestRank) bestRank = r;
                });
                if (bestRank !== 999) rankText = `Choice ${bestRank}`;
            } else {
                const rank = camper.choices.indexOf(inst.name) + 1;
                if (rank > 0) rankText = `Choice ${rank}`;
            }

            const fullName = `${camper.firstName} ${camper.lastName}`.trim() || camper.id;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500;">${fullName}</td>
                <td>${rankText}</td>
                <td style="text-align: right;"><button class="btn-remove" data-cid="${camper.id}" data-iid="${inst.id}">Remove</button></td>
            `;
            modalCampersTbody.appendChild(tr);
        });

        modalCampersTbody.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                unassignCamper(e.target.dataset.cid, e.target.dataset.iid);
            });
        });
    }

    unassignedHeader.textContent = inst.isStaging ? 'Unassigned Campers (Not in any active period)' : `Unassigned Campers for ${inst.period}`;
    unassignedContainer.innerHTML = '';
    
    let unassigned = campersData.filter(c => {
        if (inst.isStaging) {
            const hasActiveAssignment = dynamicPeriods.some(p => {
                const assignedInstId = c.assigned[p.pName];
                if (!assignedInstId) return false;
                const activeInst = instances.find(i => i.id === assignedInstId);
                return activeInst && activeInst.name === inst.name;
            });
            const isAlreadyInStaging = inst.campers.includes(c.id);
            return !hasActiveAssignment && !isAlreadyInStaging;
        } else {
            return !c.assigned[inst.period];
        }
    });

    const grouped = {};
    dynamicChoiceCols.forEach((col, idx) => {
        grouped[idx] = [];
    });
    unassigned.forEach(c => {
        const idx = c.choices.indexOf(inst.name);
        if (idx !== -1) {
            grouped[idx].push(c);
        }
    });

    let hasUnassigned = false;
    Object.keys(grouped).forEach(idx => {
        if (grouped[idx].length === 0) return;
        hasUnassigned = true;
        const choiceRank = parseInt(idx) + 1;
        
        const table = document.createElement('table');
        table.className = 'modal-table';
        table.style.marginBottom = '1rem';
        table.innerHTML = `
            <thead>
                <tr><th colspan="2">Choice ${choiceRank} (${grouped[idx].length})</th></tr>
            </thead>
            <tbody>
                ${grouped[idx].map(c => `
                    <tr>
                        <td style="font-weight: 500;">${(`${c.firstName} ${c.lastName}`).trim() || c.id}</td>
                        <td style="text-align: right;"><button class="btn-add" data-cid="${c.id}">Add</button></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        unassignedContainer.appendChild(table);
    });

    if (!hasUnassigned) {
        unassignedContainer.innerHTML = '<p style="text-align: center; color: #64748b; padding: 1rem;">No matching unassigned campers found.</p>';
    } else {
        unassignedContainer.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const camper = campersData.find(c => c.id === e.target.dataset.cid);
                if (camper) assignCamper(camper, inst);
            });
        });
    }

    modal.classList.remove('hidden');
}

function showCamperViewMode() {
    camperViewContainer.classList.remove('hidden');
    camperEditContainer.classList.add('hidden');
    editCamperBtn.textContent = "Edit Camper";
    editCamperBtn.style.background = "#0ea5e9";
}

function toggleCamperEditMode() {
    if (camperEditContainer.classList.contains('hidden')) {
        if (!currentEditingCamper) return;

        editCamperFirst.value = currentEditingCamper.firstName;
        editCamperLast.value = currentEditingCamper.lastName;
        editCamperEmail.value = currentEditingCamper.email || '';
        editCamperOrg.value = currentEditingCamper.organization || '';
        editCamperNotes.value = currentEditingCamper.notes || '';

        editCamperChoicesContainer.innerHTML = '';
        const electiveNames = Array.from(electivesMap.keys()).sort();

        const choiceCount = Math.max(dynamicChoiceCols.length, currentEditingCamper.choices.length);
        for (let i = 0; i < choiceCount; i++) {
            const currentChoiceVal = currentEditingCamper.choices[i] || '';
            
            let optionsHtml = `<option value="">None</option>`;
            electiveNames.forEach(elName => {
                const selected = elName === currentChoiceVal ? 'selected' : '';
                optionsHtml += `<option value="${elName}" ${selected}>${elName}</option>`;
            });

            editCamperChoicesContainer.innerHTML += `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.85rem; font-weight: 600; width: 80px;">Choice ${i+1}:</span>
                    <select class="camper-choice-select" style="flex: 1; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                        ${optionsHtml}
                    </select>
                </div>
            `;
        }

        camperViewContainer.classList.add('hidden');
        camperEditContainer.classList.remove('hidden');
        editCamperBtn.textContent = "View Camper";
        editCamperBtn.style.background = "#64748b";
    } else {
        showCamperViewMode();
    }
}

function saveCamperEdits() {
    if (!currentEditingCamper) return;

    const newFirst = editCamperFirst.value.trim();
    const newLast = editCamperLast.value.trim();
    const newEmail = editCamperEmail.value.trim();
    const newOrg = editCamperOrg.value.trim();
    const newNotes = editCamperNotes.value.trim();

    const dropdowns = editCamperChoicesContainer.querySelectorAll('.camper-choice-select');
    const newChoices = [];
    dropdowns.forEach(select => {
        if (select.value) {
            newChoices.push(select.value);
        }
    });

    currentEditingCamper.firstName = newFirst;
    currentEditingCamper.lastName = newLast;
    currentEditingCamper.email = newEmail;
    currentEditingCamper.organization = newOrg;
    currentEditingCamper.notes = newNotes;
    currentEditingCamper.choices = newChoices;

    alert("Camper details saved!");
    showCamperViewMode();
    
    openCamperModal(currentEditingCamper);
    renderCampers();
    renderElectives();
}

function openCamperModal(camper) {
    currentEditingCamper = camper;
    showCamperViewMode();

    const title = document.getElementById('camper-modal-title');
    title.textContent = `${camper.firstName} ${camper.lastName}`.trim() || `Camper ${camper.id}`;

    const info = document.getElementById('camper-modal-info');
    info.innerHTML = `
        <div><strong>ID:</strong> ${camper.id}</div>
        <div><strong>Email:</strong> ${camper.email || '-'}</div>
        <div><strong>Organization:</strong> ${camper.organization || '-'}</div>
        <div><strong>Date:</strong> ${camper.date || '-'}</div>
        <div style="grid-column: 1 / -1;"><strong>Notes:</strong> ${camper.notes || '-'}</div>
    `;

    const tbody = document.getElementById('camper-modal-assignments');
    tbody.innerHTML = '';
    
    if (camper.assigned['available']) {
        const inst = instances.find(i => i.id === camper.assigned['available']);
        const rank = camper.choices.indexOf(inst.name) + 1;
        tbody.innerHTML += `
            <tr>
                <td><strong>Staging</strong></td>
                <td>${inst.name}</td>
                <td>${rank > 0 ? 'Choice ' + rank : '-'}</td>
            </tr>
        `;
    }

    dynamicPeriods.forEach(p => {
        const instId = camper.assigned[p.pName];
        if (instId) {
            const inst = instances.find(i => i.id === instId);
            
            let rankText = '-';
            if (inst.isSynthetic) {
                const nameParts = inst.name.split(' / ');
                let bestRank = 999;
                nameParts.forEach(part => {
                    const r = camper.choices.indexOf(part) + 1;
                    if (r > 0 && r < bestRank) bestRank = r;
                });
                if (bestRank !== 999) rankText = `Choice ${bestRank}`;
            } else {
                const rank = camper.choices.indexOf(inst.name) + 1;
                if (rank > 0) rankText = `Choice ${rank}`;
            }

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.pName}</strong></td>
                    <td>${inst.name}</td>
                    <td>${rankText}</td>
                </tr>
            `;
        } else {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.pName}</strong></td>
                    <td style="color:#ef4444">Unassigned</td>
                    <td>-</td>
                </tr>
            `;
        }
    });

    camperModal.classList.remove('hidden');
}

// Exports
function exportCamperCSV() {
    const exportData = campersData.map(camper => {
        const row = {
            'Camper ID': camper.id,
            'First Name': camper.firstName,
            'Last Name': camper.lastName
        };

        dynamicChoiceCols.forEach((col, idx) => {
            row[col] = camper.choices[idx];
        });

        dynamicPeriods.forEach(p => {
            const instId = camper.assigned[p.pName];
            const inst = instances.find(i => i.id === instId);
            row[`${p.pName} Assignment`] = inst ? inst.name : 'Unassigned';
        });
        
        const stagingInstId = camper.assigned['available'];
        const stagingInst = instances.find(i => i.id === stagingInstId);
        row['Staged For'] = stagingInst ? stagingInst.name : '';

        return row;
    });

    const csv = Papa.unparse(exportData);
    downloadCSV(csv, "camper_master_list.csv");
}

function printInstructorRosters() {
    let activeInstances = instances.filter(i => !i.isStaging);
    if (activeInstances.length === 0) {
        alert("No active assignments to print.");
        return;
    }

    let grouped = {};
    activeInstances.forEach(inst => {
        if (!grouped[inst.name]) grouped[inst.name] = [];
        grouped[inst.name].push(inst);
    });

    let electiveNames = Object.keys(grouped).sort();

    let html = `
    <html>
    <head>
        <title>Instructor Rosters</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .page { page-break-after: always; padding-bottom: 20px; }
            .page:last-child { page-break-after: avoid; }
            h1 { font-size: 24px; margin-bottom: 5px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .meta { margin-bottom: 20px; font-size: 14px; color: #444; }
            h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; background: #eee; padding: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
            th { background: #fafafa; }
            .notes { font-size: 12px; color: #666; font-style: italic; }
        </style>
    </head>
    <body>
    `;

    electiveNames.forEach(name => {
        const elective = electivesMap.get(name);
        if (!elective) return;

        html += `<div class="page">`;
        html += `<h1>${name}</h1>`;
        
        let metaHtml = [];
        if (elective.resources['Instructor']) metaHtml.push(`<strong>Instructor:</strong> ${elective.resources['Instructor']}`);
        if (elective.resources['Location']) metaHtml.push(`<strong>Location:</strong> ${elective.resources['Location']}`);
        if (elective.resources['Supplies']) metaHtml.push(`<strong>Supplies:</strong> ${elective.resources['Supplies']}`);
        if (metaHtml.length > 0) {
            html += `<div class="meta">${metaHtml.join(' &nbsp;|&nbsp; ')}</div>`;
        }

        let insts = grouped[name];
        insts.sort((a, b) => a.period.localeCompare(b.period));

        insts.forEach(inst => {
            html += `<h2>${inst.period} (${inst.campers.length} Campers)</h2>`;
            if (inst.campers.length === 0) {
                html += `<p>No campers assigned.</p>`;
            } else {
                html += `<table>
                            <thead>
                                <tr>
                                    <th style="width: 25%">Name</th>
                                    <th style="width: 25%">Organization</th>
                                    <th style="width: 50%">Notes</th>
                                </tr>
                            </thead>
                            <tbody>`;
                
                let sortedCampers = inst.campers.map(cid => campersData.find(c => c.id === cid)).filter(c => c);
                sortedCampers.sort((a, b) => {
                    const nameA = (`${a.firstName} ${a.lastName}`.trim() || a.id).toLowerCase();
                    const nameB = (`${b.firstName} ${b.lastName}`.trim() || b.id).toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                sortedCampers.forEach(c => {
                    const fullName = `${c.firstName} ${c.lastName}`.trim() || c.id;
                    html += `<tr>
                                <td><strong>${fullName}</strong></td>
                                <td>${c.organization || ''}</td>
                                <td class="notes">${c.notes || ''}</td>
                             </tr>`;
                });
                
                html += `   </tbody>
                         </table>`;
            }
        });

        html += `</div>`;
    });

    html += `
    <script>
        window.onload = function() { window.print(); }
    </script>
    </body>
    </html>`;

    const printWin = window.open('', '_blank');
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
}

function exportScheduleCSV() {
    let rows = [];
    
    let sortedInstances = [...instances].filter(i => !i.isStaging);
    sortedInstances.sort((a, b) => {
        if (a.period < b.period) return -1;
        if (a.period > b.period) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });

    sortedInstances.forEach(inst => {
        const elective = electivesMap.get(inst.name);
        if (!elective) return;
        
        inst.campers.forEach(cid => {
            const c = campersData.find(camper => camper.id === cid);
            if (c) {
                rows.push({
                    'Period': inst.period,
                    'Elective Name': inst.name,
                    'Instructor': elective.resources['Instructor'] || '',
                    'Location': elective.resources['Location'] || '',
                    'Supplies': elective.resources['Supplies'] || '',
                    'Camper ID': c.id,
                    'First Name': c.firstName,
                    'Last Name': c.lastName,
                    'Email': c.email || '',
                    'Organization': c.organization || '',
                    'Camper Notes': c.notes || ''
                });
            }
        });
    });

    if (rows.length === 0) {
        alert("No active assignments to export.");
        return;
    }

    downloadCSV(Papa.unparse(rows), "logistics_schedule.csv");
}

function saveProjectFile() {
    const electivesArray = Array.from(electivesMap.entries());

    const projectData = {
        version: "1.0",
        rawElectives: rawElectives,
        rawCampers: rawCampers,
        instances: instances,
        campersData: campersData,
        electivesMap: electivesArray,
        dynamicPeriods: dynamicPeriods,
        dynamicChoiceCols: dynamicChoiceCols
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "camp_sorting_project.json");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleProjectUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const projectData = JSON.parse(event.target.result);

            if (!projectData.rawElectives || !projectData.rawCampers || !projectData.instances || !projectData.campersData) {
                alert("Invalid project file structure.");
                return;
            }

            rawElectives = projectData.rawElectives || [];
            rawCampers = projectData.rawCampers || [];
            instances = projectData.instances || [];
            campersData = projectData.campersData || [];
            dynamicPeriods = projectData.dynamicPeriods || [];
            dynamicChoiceCols = projectData.dynamicChoiceCols || [];

            electivesMap.clear();
            if (Array.isArray(projectData.electivesMap)) {
                projectData.electivesMap.forEach(([key, value]) => {
                    electivesMap.set(key, value);
                });
            }

            buildKanbanBoard();
            renderElectives();
            renderCampers();

            exportBtn.disabled = false;
            autoAssignBtn.disabled = false;

            elStatus.textContent = 'Loaded (Project)';
            elStatus.className = 'status-badge success';
            camperStatus.textContent = 'Loaded (Project)';
            camperStatus.className = 'status-badge success';
            projectStatus.textContent = 'Loaded';
            projectStatus.className = 'status-badge success';

            alert("Project loaded successfully!");
        } catch (err) {
            console.error(err);
            alert("Error parsing project file: " + err.message);
        }
    };
    reader.readAsText(file);
}

// Run init
init();
