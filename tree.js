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
  createGrid();
  document.getElementById('exportSvg').addEventListener('click', () => exportTree('svg'));
  document.getElementById('exportPng').addEventListener('click', () => exportTree('png'));
  document.getElementById('exportPdf').addEventListener('click', () => exportTree('pdf'));
}

function createGrid() {
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const size = 800;
  const step = 50;
  for (let x = 0; x <= size; x += step) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', size);
    line.setAttribute('class', 'grid-line');
    gridGroup.appendChild(line);
  }
  for (let y = 0; y <= size; y += step) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', size);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'grid-line');
    gridGroup.appendChild(line);
  }
  svgGroup.appendChild(gridGroup);
}

export function addPerson(data) {
  pushHistory();
  personCount++;
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodeGroup.setAttribute('class', 'tree-node');
  nodeGroup.setAttribute('data-id', `p${personCount}`);
  nodeGroup.setAttribute('data-name', data.name);
  nodeGroup.setAttribute('data-surname', data.surname || '');
  nodeGroup.setAttribute('data-birthname', data.birthname || '');
  nodeGroup.setAttribute('data-dob', data.dob || '');
  nodeGroup.setAttribute('data-gender', data.gender);
  nodeGroup.setAttribute('data-mother', data.motherId || '');
  nodeGroup.setAttribute('data-father', data.fatherId || '');
  nodeGroup.setAttribute('data-spouse', data.spouseId || '');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', document.getElementById('nodeSizeInput').value || 40);
  circle.setAttribute('fill', document.getElementById('nodeColorPicker').value || '#3498db');
  circle.addEventListener('click', (e) => selectNode(e, nodeGroup));
  circle.addEventListener('dblclick', () => openEdit(nodeGroup.getAttribute('data-id')));
  nodeGroup.appendChild(circle);
  const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  nameText.setAttribute('class', 'name');
  nameText.setAttribute('text-anchor', 'middle');
  nameText.setAttribute('dy', '-10');
  nameText.textContent = data.name + (data.surname ? ` ${data.surname}` : '');
  nodeGroup.appendChild(nameText);
  const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dobText.setAttribute('class', 'dob');
  dobText.setAttribute('text-anchor', 'middle');
  dobText.setAttribute('dy', '12');
  dobText.textContent = data.dob;
  nodeGroup.appendChild(dobText);
  nodeGroup.setAttribute('transform', `translate(${100 + personCount * 10}, ${100 + personCount * 10})`);
  svgGroup.appendChild(nodeGroup);
  updateSearchableSelects();
  redrawTable();
}

function openEdit(id) {
  import('./modal.js').then(({ openModal }) => openModal(true, id));
}

function selectNode(event, nodeGroup) {
  if (connectMode) {
    if (!firstNode) {
      firstNode = nodeGroup;
      highlightNode(firstNode);
    } else {
      createRelation(firstNode, nodeGroup);
      unhighlightNode(firstNode);
      firstNode = null;
      connectMode = false;
      redrawTable();
    }
  }
  event.stopPropagation();
}

export function editPerson(id, data) {
  pushHistory();
  const node = document.querySelector(`g[data-id='${id}']`);
  node.setAttribute('data-name', data.name);
  node.setAttribute('data-surname', data.surname || '');
  node.setAttribute('data-birthname', data.birthname || '');
  node.setAttribute('data-dob', data.dob || '');
  node.setAttribute('data-gender', data.gender);
  node.setAttribute('data-mother', data.motherId || '');
  node.setAttribute('data-father', data.fatherId || '');
  node.setAttribute('data-spouse', data.spouseId || '');
  const texts = node.querySelectorAll('text');
  texts[0].textContent = data.name + (data.surname ? ` ${data.surname}` : '');
  texts[1].textContent = data.dob;
  updateSearchableSelects();
  redrawTable();
}

function highlightNode(node) {
  node.querySelector('circle').setAttribute('stroke', '#e74c3c');
}

function unhighlightNode(node) {
  node.querySelector('circle').removeAttribute('stroke');
}

function createRelation(nodeA, nodeB) {
  pushHistory();
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', 'relation');
  const x1 = getCenterX(nodeA);
  const y1 = getCenterY(nodeA);
  const x2 = getCenterX(nodeB);
  const y2 = getCenterY(nodeB);
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  svgGroup.appendChild(line);
}

function getCenterX(node) {
  const transform = node.getAttribute('transform');
  const match = /translate\(([^,]+), ([^)]+)\)/.exec(transform);
  return parseFloat(match[1]);
}

function getCenterY(node) {
  const transform = node.getAttribute('transform');
  const match = /translate\(([^,]+), ([^)]+)\)/.exec(transform);
  return parseFloat(match[2]);
}

function pushHistory() {
  const snapshot = svgGroup.cloneNode(true);
  undoStack.push(snapshot);
}

export function undo() {
  if (undoStack.length === 0) return;
  const last = undoStack.pop();
  svg.replaceChild(last, svgGroup);
  svgGroup = last;
  updateSearchableSelects();
  redrawTable();
}

window.addEventListener('DOMContentLoaded', initializeTree);

document.documentElement.addEventListener('click', () => { firstNode = null; connectMode = false; });
