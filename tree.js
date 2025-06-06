/* =================================================================
File: tree.js
================================================================= */
import { redrawTable } from './table.js';
import { updateSearchableSelects } from './searchableSelect.js';
import { exportTree } from './exporter.js';

let svg, svgGroup;
let personCount = 0;
let undoStack = [];
let connectMode = false;
let firstNode = null;

export function initializeTree() {
svg = document.getElementById('svgArea');
svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
svg.appendChild(svgGroup);
svg.addEventListener('click', () => {
if (connectMode) return;
// Deselect any node selection
document.querySelectorAll('g.tree-node circle').forEach(c => c.classList.remove('selected'));
});
}

export function addPerson({ name, surname, birthname, dob, gender, motherId, fatherId, spouseId }) {
const id = p${++personCount};
const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
group.setAttribute('data-id', id);
group.setAttribute('data-name', name);
group.setAttribute('data-surname', surname);
group.setAttribute('data-birthname', birthname);
group.setAttribute('data-dob', dob);
group.setAttribute('data-gender', gender);
if (motherId) group.setAttribute('data-mother', motherId);
if (fatherId) group.setAttribute('data-father', fatherId);
if (spouseId) group.setAttribute('data-spouse', spouseId);
group.classList.add('tree-node');

const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
circle.setAttribute('r', document.getElementById('nodeSizeInput').value || 40);
circle.setAttribute('fill', document.getElementById('nodeColorPicker').value || '#3498db');
circle.classList.add('node-shape');
group.appendChild(circle);

const textName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
textName.classList.add('name');
textName.setAttribute('text-anchor', 'middle');
textName.setAttribute('dy', '-10');
textName.setAttribute('fill', document.getElementById('nameColorPicker').value || '#333');
textName.setAttribute('font-family', document.getElementById('fontSelect').value || 'Inter');
textName.setAttribute('font-size', document.getElementById('fontSizeInput').value || '14');
textName.textContent = name;
group.appendChild(textName);

const textDob = document.createElementNS('http://www.w3.org/2000/svg', 'text');
textDob.classList.add('dob');
textDob.setAttribute('text-anchor', 'middle');
textDob.setAttribute('dy', '12');
textDob.setAttribute('fill', document.getElementById('dateColorPicker').value || '#757575');
textDob.setAttribute('font-family', document.getElementById('fontSelect').value || 'Inter');
textDob.setAttribute('font-size', document.getElementById('fontSizeInput').value || '12');
textDob.textContent = dob;
group.appendChild(textDob);

// Position new nodes at center
const rect = svg.getBoundingClientRect();
group.setAttribute('transform', translate(${rect.width/2}, ${rect.height/2}));

// Register drag behavior
circle.addEventListener('mousedown', (e) => startDrag(e, group));

// Selection styling
circle.addEventListener('click', (e) => {
e.stopPropagation();
document.querySelectorAll('g.tree-node circle').forEach(c => c.classList.remove('selected'));
circle.classList.add('selected');
});

svgGroup.appendChild(group);
recordHistory();
updateSearchableSelects();
redrawTable();
}

export function editPerson(id, { name, surname, birthname, dob, gender, motherId, fatherId, spouseId }) {
const group = document.querySelector(g[data-id='${id}']);
group.setAttribute('data-name', name);
group.setAttribute('data-surname', surname);
group.setAttribute('data-birthname', birthname);
group.setAttribute('data-dob', dob);
group.setAttribute('data-gender', gender);
if (motherId) group.setAttribute('data-mother', motherId);
else group.removeAttribute('data-mother');
if (fatherId) group.setAttribute('data-father', fatherId);
else group.removeAttribute('data-father');
if (spouseId) group.setAttribute('data-spouse', spouseId);
else group.removeAttribute('data-spouse');
group.querySelector('text.name').textContent = name;
group.querySelector('text.dob').textContent = dob;
recordHistory();
updateSearchableSelects();
redrawTable();
}

function startDrag(evt, node) {
evt.preventDefault();
let pt = svg.createSVGPoint();
const onMouseMove = (e) => {
pt.x = e.clientX;
pt.y = e.clientY;
const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
node.setAttribute('transform', translate(${svgPt.x}, ${svgPt.y}));
updateConnections(id);
};
const onMouseUp = () => {
document.removeEventListener('mousemove', onMouseMove);
document.removeEventListener('mouseup', onMouseUp);
recordHistory();
};
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);
}

export function toggleConnectMode() {
connectMode = !connectMode;
firstNode = null;
// Visual indicator (e.g., change cursor)
svg.style.cursor = connectMode ? 'crosshair' : 'grab';
}

export function handleSvgClick(evt) {
if (!connectMode) return;
const target = evt.target;
if (target.tagName === 'circle') {
const node = target.parentNode;
if (!firstNode) {
firstNode = node;
target.classList.add('selected');
} else if (firstNode !== node) {
createConnection(firstNode, node);
firstNode.querySelector('circle').classList.remove('selected');
firstNode = null;
recordHistory();
}
}
}

function createConnection(nodeA, nodeB) {
const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
const posA = getNodeCenter(nodeA);
const posB = getNodeCenter(nodeB);
line.setAttribute('x1', posA.x);
line.setAttribute('y1', posA.y);
line.setAttribute('x2', posB.x);
line.setAttribute('y2', posB.y);
line.classList.add('relation');
svgGroup.insertBefore(line, svgGroup.firstChild);
}

function getNodeCenter(node) {
const matrix = node.getCTM();
const circle = node.querySelector('circle');
const r = parseFloat(circle.getAttribute('r'));
return { x: matrix.e, y: matrix.f };
}

export function recordHistory() {
const snapshot = svgGroup.innerHTML;
undoStack.push(snapshot);
}

export function undo() {
if (undoStack.length < 2) return;
undoStack.pop();
const last = undoStack[undoStack.length - 1];
svgGroup.innerHTML = last;
updateSearchableSelects();
redrawTable();
}

export function exportCurrentTree(format) {
exportTree(format, svgGroup);
}

export function deletePerson(id) {
const group = document.querySelector(g[data-id='${id}']);
if (!group) return;
svgGroup.removeChild(group);
// Also remove associated lines
document.querySelectorAll('line.relation').forEach((line) => {
// Simplified: any line connecting to this node should be removed
const x1 = parseFloat(line.getAttribute('x1'));
const y1 = parseFloat(line.getAttribute('y1'));
const pos = getNodeCenter(group);
if ((x1 === pos.x && y1 === pos.y)) {
line.parentNode.removeChild(line);
}
});
recordHistory();
updateSearchableSelects();
redrawTable();
}